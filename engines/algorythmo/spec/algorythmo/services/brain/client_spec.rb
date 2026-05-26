# frozen_string_literal: true

require 'rails_helper'
require 'tmpdir'

# Tests for Algorythmo::Brain::Client.
#
# All subprocess specs stub Open3.popen3 — no real gbrain binary required.
# Path validation specs mix stubbed File methods with real FS (Tempfile) to cover
# both macOS symlink realpath and injection attacks.
RSpec.describe Algorythmo::Brain::Client do
  subject(:client) { described_class.new(1) }

  # ---------------------------------------------------------------------------
  # Shared popen3 stub
  # ---------------------------------------------------------------------------

  # Simulates a subprocess result without spawning a real process.
  # Open3's wait_thr carries a monkey-patched #pid on Thread; we use a plain
  # double to avoid VerifiedDoubles on a non-standard method.
  def stub_popen3(stdout:, stderr: '', exit_status: 0)
    status   = instance_double(Process::Status, success?: exit_status.zero?, exitstatus: exit_status)
    wait_thr = double('Open3WaitThread', pid: 99_999, value: status)
    allow(wait_thr).to receive(:join).and_return(wait_thr) # returns self = not timed out
    allow(wait_thr).to receive(:alive?).and_return(false)

    allow(Open3).to receive(:popen3) do |*_args, &blk|
      blk.call(
        instance_double(IO, close: nil),
        instance_double(IO, read: stdout),
        instance_double(IO, read: stderr),
        wait_thr
      )
    end
  end

  # ---------------------------------------------------------------------------
  # Subprocess args — must NOT include --dir (premise audit v4)
  # ---------------------------------------------------------------------------
  describe '#capture — subprocess receives resolved real path, no --dir' do
    around do |example|
      Dir.mktmpdir do |tmpdir|
        @tmp_file = File.join(tmpdir, 'brain_test.md')
        File.write(@tmp_file, '# test')
        example.run
      end
    end

    it 'calls gbrain capture <real_path> without --dir' do
      stub_popen3(stdout: '{}')
      client.capture(file: @tmp_file)
      expect(Open3).to have_received(:popen3) do |*args|
        expect(args).not_to include('--dir')
        expect(args[1]).to eq('capture')
        # arg[2] is the resolved real_path — may differ on macOS symlinks
        expect(args[2]).to be_a(String)
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Path validation — covers P1.1/P1.2 macOS symlink, P1.3 TOCTOU, P2.2 attacks
  # ---------------------------------------------------------------------------
  describe '#capture — path validation' do
    it 'rejects relative paths' do
      expect { client.capture(file: 'relative/path.md') }
        .to raise_error(ArgumentError, /must be absolute/)
    end

    it 'rejects paths containing ..' do
      expect { client.capture(file: '/tmp/../etc/passwd') }
        .to raise_error(ArgumentError, /must not contain/)
    end

    it 'rejects null byte injection' do
      expect { client.capture(file: "/tmp/foo\x00/etc/passwd") }
        .to raise_error(ArgumentError, /must not contain null/)
    end

    it 'rejects /tmpfoo prefix-attack paths (separator boundary)' do
      allow(File).to receive(:realpath).and_call_original
      allow(File).to receive(:realpath).with('/tmpfoo/evil.md').and_return('/tmpfoo/evil.md')
      allow(File).to receive(:realpath).with(Dir.tmpdir).and_call_original
      allow(File).to receive(:file?).with('/tmpfoo/evil.md').and_return(true)
      expect { client.capture(file: '/tmpfoo/evil.md') }
        .to raise_error(ArgumentError, /must reside inside tmpdir/)
    end

    it 'rejects paths outside tmpdir' do
      allow(File).to receive(:realpath).and_call_original
      allow(File).to receive(:realpath).with('/etc/hosts').and_return('/etc/hosts')
      allow(File).to receive(:realpath).with(Dir.tmpdir).and_call_original
      allow(File).to receive(:file?).with('/etc/hosts').and_return(true)
      expect { client.capture(file: '/etc/hosts') }
        .to raise_error(ArgumentError, /must reside inside tmpdir/)
    end

    it 'rejects symlinks that resolve outside tmpdir' do
      symlink = File.join(Dir.tmpdir, 'evil_link')
      allow(File).to receive(:realpath).and_call_original
      allow(File).to receive(:realpath).with(symlink).and_return('/etc/passwd')
      allow(File).to receive(:realpath).with(Dir.tmpdir).and_call_original
      allow(File).to receive(:file?).with('/etc/passwd').and_return(true)
      expect { client.capture(file: symlink) }
        .to raise_error(ArgumentError, /must reside inside tmpdir/)
    end

    it 'rejects directories (non-file paths)' do
      Dir.mktmpdir do |dir|
        # dir is a real tmpdir path — passes the tmpdir containment check but
        # is a directory, not a file.
        expect { client.capture(file: dir) }
          .to raise_error(ArgumentError, /must be a regular file/)
      end
    end

    it 'raises ArgumentError when realpath raises ELOOP (circular symlink)' do
      bad = File.join(Dir.tmpdir, 'loop_link')
      allow(File).to receive(:realpath).and_call_original
      allow(File).to receive(:realpath).with(bad).and_raise(Errno::ELOOP)
      expect { client.capture(file: bad) }
        .to raise_error(ArgumentError, /could not be resolved/)
    end

    it 'passes real_path (not original) to subprocess — TOCTOU mitigation' do
      # macOS: Dir.tmpdir resolves to /var/folders but realpath = /private/var/folders
      Dir.mktmpdir do |tmpdir|
        tmp_file = File.join(tmpdir, 'safe.md')
        File.write(tmp_file, '# safe')
        stub_popen3(stdout: '{}')
        client.capture(file: tmp_file)
        expect(Open3).to have_received(:popen3) do |*args|
          # The path passed to gbrain must be the resolved real path
          expect(File.absolute_path?(args[2])).to be(true)
        end
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Subprocess success paths
  # ---------------------------------------------------------------------------
  describe '#search' do
    it 'parses JSON stdout and returns the result' do
      stub_popen3(stdout: '[{"title":"Brain page","score":0.9}]')
      result = client.search(query: 'pricing PME')
      expect(result).to eq([{ 'title' => 'Brain page', 'score' => 0.9 }])
    end

    it 'passes --limit to the subprocess' do
      stub_popen3(stdout: '[]')
      client.search(query: 'test', limit: 5)
      expect(Open3).to have_received(:popen3) do |*args|
        limit_idx = args.index('--limit')
        expect(args[limit_idx + 1]).to eq('5')
      end
    end
  end

  describe '#think' do
    it 'parses JSON stdout' do
      stub_popen3(stdout: '{"answer":"Use monthly pricing","citations":[]}')
      result = client.think(prompt: 'what pricing strategy?')
      expect(result['answer']).to eq('Use monthly pricing')
    end

    it 'does not pass --context when context is nil' do
      stub_popen3(stdout: '{}')
      client.think(prompt: 'question')
      expect(Open3).to have_received(:popen3) do |*args|
        expect(args).not_to include('--context')
      end
    end
  end

  describe '#stats' do
    it 'returns parsed JSON hash' do
      stub_popen3(stdout: '{"pages":42,"edges":120}')
      expect(client.stats).to eq({ 'pages' => 42, 'edges' => 120 })
    end
  end

  # ---------------------------------------------------------------------------
  # Error paths
  # ---------------------------------------------------------------------------
  describe 'SubprocessError' do
    it 'raises SubprocessError when gbrain exits non-zero' do
      stub_popen3(stdout: '', stderr: 'fatal: corrupt database', exit_status: 1)
      expect { client.stats }.to raise_error(described_class::SubprocessError, /exited 1/)
    end

    it 'raises SubprocessError on non-JSON stdout from a successful exit' do
      stub_popen3(stdout: 'not json')
      expect { client.stats }.to raise_error(described_class::SubprocessError, /non-JSON/)
    end

    it 'raises SubprocessError when binary is missing' do
      allow(Open3).to receive(:popen3).and_raise(Errno::ENOENT, 'gbrain')
      expect { client.stats }.to raise_error(described_class::SubprocessError, /not found/)
    end
  end

  describe 'TimeoutError' do
    it 'kills subprocess and raises TimeoutError when wait_thr.join returns nil' do
      # wait_thr.join(timeout) returns nil when deadline is missed (Thread#join contract).
      status   = instance_double(Process::Status, success?: false, exitstatus: 9)
      wait_thr = double('Open3WaitThread', pid: 12_345, value: status)
      allow(wait_thr).to receive(:join).and_return(nil) # nil = timed out
      allow(wait_thr).to receive(:alive?).and_return(false) # already exited after TERM

      allow(Process).to receive(:kill)

      allow(Open3).to receive(:popen3) do |*_args, &blk|
        blk.call(
          instance_double(IO, close: nil),
          instance_double(IO, read: ''),
          instance_double(IO, read: ''),
          wait_thr
        )
      end

      expect { client.stats }.to raise_error(described_class::TimeoutError, /timed out/)
    end

    it 'rescues ESRCH when process already exited before kill' do
      status   = instance_double(Process::Status, success?: false, exitstatus: 9)
      wait_thr = double('Open3WaitThread', pid: 99_001, value: status)
      allow(wait_thr).to receive(:join).and_return(nil)
      allow(wait_thr).to receive(:alive?).and_return(false)
      allow(Process).to receive(:kill).and_raise(Errno::ESRCH)

      allow(Open3).to receive(:popen3) do |*_args, &blk|
        blk.call(
          instance_double(IO, close: nil),
          instance_double(IO, read: ''),
          instance_double(IO, read: ''),
          wait_thr
        )
      end

      expect { client.stats }.to raise_error(described_class::TimeoutError)
    end
  end
end
