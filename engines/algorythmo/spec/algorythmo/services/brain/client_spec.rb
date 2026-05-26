# frozen_string_literal: true

require 'rails_helper'

# Tests for Algorythmo::Brain::Client.
#
# All specs stub Open3.popen3 — no real gbrain binary required.
# Path validation specs exercise the defensive guard in #capture.
RSpec.describe Algorythmo::Brain::Client do
  subject(:client) { described_class.new(1) }

  # Builds a fake popen3 block that simulates a subprocess result.
  # Yields [stdin_io, stdout_io, stderr_io, wait_thread].
  def stub_popen3(stdout:, stderr: '', exit_status: 0)
    # Open3's wait_thr has #pid monkey-patched onto Thread; plain double avoids
    # a misleading VerifiedDoubles failure on a method not in Thread's interface.
    status   = instance_double(Process::Status, success?: exit_status.zero?, exitstatus: exit_status)
    wait_thr = double('Open3WaitThread', pid: 99_999, status: false, value: status)

    stdin_io  = instance_double(IO, close: nil)
    stdout_io = instance_double(IO, read: stdout)
    stderr_io = instance_double(IO, read: stderr)

    allow(Open3).to receive(:popen3) do |*_args, &blk|
      blk.call(stdin_io, stdout_io, stderr_io, wait_thr)
    end
  end

  # -----------------------------------------------------------------------
  # Subprocess args — must NOT include --dir (v4 premise audit)
  # -----------------------------------------------------------------------
  describe '#capture — subprocess args' do
    let(:tmp_file) do
      f = Tempfile.new(['brain_test', '.md'], Dir.tmpdir)
      f.write('# test')
      f.close
      f.path
    end

    after { File.unlink(tmp_file) if File.exist?(tmp_file) }

    it 'calls gbrain capture <path> without --dir' do
      stub_popen3(stdout: '{}')
      client.capture(file: tmp_file)
      expect(Open3).to have_received(:popen3) do |*args|
        expect(args).not_to include('--dir')
        expect(args[1]).to eq('capture')
        expect(args[2]).to eq(tmp_file)
      end
    end
  end

  # -----------------------------------------------------------------------
  # Path validation
  # -----------------------------------------------------------------------
  describe '#capture — path validation' do
    it 'rejects relative paths' do
      expect { client.capture(file: 'relative/path.md') }
        .to raise_error(ArgumentError, /must be absolute/)
    end

    it 'rejects paths containing ..' do
      expect { client.capture(file: '/tmp/../etc/passwd') }
        .to raise_error(ArgumentError, /must not contain/)
    end

    it 'rejects paths outside tmpdir' do
      # /etc/hosts is absolute, no "..", but not in tmpdir
      allow(File).to receive(:realpath).with('/etc/hosts').and_return('/etc/hosts')
      allow(File).to receive(:file?).with('/etc/hosts').and_return(true)
      expect { client.capture(file: '/etc/hosts') }
        .to raise_error(ArgumentError, /must reside inside tmpdir/)
    end

    it 'rejects symlinks that resolve outside tmpdir' do
      symlink = File.join(Dir.tmpdir, 'evil_link')
      allow(File).to receive(:realpath).with(symlink).and_return('/etc/passwd')
      allow(File).to receive(:file?).with(symlink).and_return(true)
      expect { client.capture(file: symlink) }
        .to raise_error(ArgumentError, /must reside inside tmpdir/)
    end

    it 'rejects non-file paths (directories)' do
      tmpdir_path = Dir.tmpdir
      allow(File).to receive(:realpath).with(tmpdir_path).and_return(tmpdir_path)
      allow(File).to receive(:file?).with(tmpdir_path).and_return(false)
      expect { client.capture(file: tmpdir_path) }
        .to raise_error(ArgumentError, /must be a regular file/)
    end

    it 'raises ArgumentError when File.realpath raises ELOOP (circular symlink)' do
      bad_path = File.join(Dir.tmpdir, 'loop_link')
      allow(File).to receive(:realpath).with(bad_path).and_raise(Errno::ELOOP)
      expect { client.capture(file: bad_path) }
        .to raise_error(ArgumentError, /could not be resolved/)
    end
  end

  # -----------------------------------------------------------------------
  # Subprocess success path
  # -----------------------------------------------------------------------
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

  # -----------------------------------------------------------------------
  # Error paths
  # -----------------------------------------------------------------------
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

  describe 'Timeout' do
    it 'kills subprocess and raises Timeout when deadline exceeded' do
      # Open3's wait_thr has #pid and #status — use a plain double (Thread lacks #pid).
      # Open3's wait_thr has #pid monkey-patched onto Thread — plain double is correct here.
      wait_thr = double('Open3WaitThread', pid: 12_345)
      call_count = 0
      allow(wait_thr).to receive(:status) do
        call_count += 1
        call_count < 3 ? :run : false
      end
      allow(wait_thr).to receive(:value).and_return(
        instance_double(Process::Status, success?: false, exitstatus: 9)
      )

      allow(Process).to receive(:kill).with('KILL', 12_345)

      allow(Open3).to receive(:popen3) do |*_args, &blk|
        blk.call(
          instance_double(IO, close: nil),
          instance_double(IO, read: ''),
          instance_double(IO, read: ''),
          wait_thr
        )
      end

      stub_const("#{described_class}::READ_TIMEOUT", 0)
      expect { client.stats }.to raise_error(described_class::Timeout, /timed out/)
    end
  end
end
