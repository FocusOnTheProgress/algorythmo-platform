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
  # Records the env hash (first popen3 arg) of every invocation so isolation tests
  # can inspect multiple calls without re-stubbing (which would reset the spy count).
  let(:popen3_envs) { [] }

  def stub_popen3(stdout:, stderr: '', exit_status: 0)
    status   = instance_double(Process::Status, success?: exit_status.zero?, exitstatus: exit_status)
    wait_thr = double('Open3WaitThread', pid: 99_999, value: status)
    allow(wait_thr).to receive(:join).and_return(wait_thr) # returns self = not timed out
    allow(wait_thr).to receive(:alive?).and_return(false)

    allow(Open3).to receive(:popen3) do |first, *_rest, &blk|
      popen3_envs << first
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
    let(:tmp_state) { {} }

    around do |example|
      Dir.mktmpdir do |tmpdir|
        tmp_state[:file] = File.join(tmpdir, 'brain_test.md')
        File.write(tmp_state[:file], '# test')
        example.run
      end
    end

    it 'calls gbrain capture <real_path> without --dir' do
      stub_popen3(stdout: '{}')
      client.capture(file: tmp_state[:file])
      expect(Open3).to have_received(:popen3) do |env, *cli|
        expect(env).to be_a(Hash) # first arg is always the subprocess env
        expect(cli).not_to include('--dir')
        expect(cli[1]).to eq('capture')
        # cli[2] is the resolved real_path — may differ on macOS symlinks
        expect(cli[2]).to be_a(String)
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
        expect(Open3).to have_received(:popen3) do |_env, *cli|
          # The path passed to gbrain must be the resolved real path
          expect(File.absolute_path?(cli[2])).to be(true)
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
      expect(Open3).to have_received(:popen3) do |_env, *cli|
        limit_idx = cli.index('--limit')
        expect(cli[limit_idx + 1]).to eq('5')
      end
    end
  end

  describe '#think' do
    # Real think --json shape (verified: src/core/think/index.ts at pinned SHA).
    let(:think_json) do
      {
        answer: 'Use monthly pricing',
        gaps: [],
        modelUsed: 'deepseek:deepseek-chat',
        pagesGathered: 3,
        takesGathered: 1,
        graphHits: 2,
        citations: [{ page_slug: 'pricing', row_num: 4, citation_index: 1 }],
        warnings: [],
        saved_slug: nil,
        evidence_inserted: 1
      }.to_json
    end

    it 'parses the real think --json payload shape' do
      stub_popen3(stdout: think_json)
      result = client.think(prompt: 'what pricing strategy?')

      expect(result['answer']).to eq('Use monthly pricing')
      expect(result['modelUsed']).to eq('deepseek:deepseek-chat')
      expect(result['citations'].first).to eq(
        'page_slug' => 'pricing', 'row_num' => 4, 'citation_index' => 1
      )
    end

    it 'passes --json (required — gbrain prints markdown otherwise)' do
      stub_popen3(stdout: '{}')
      client.think(prompt: 'question')
      expect(Open3).to have_received(:popen3) do |*args|
        # args[0] is the env hash; CLI tokens follow.
        expect(args).to include('--json')
      end
    end

    it 'never passes --context (flag does not exist in gbrain)' do
      stub_popen3(stdout: '{}')
      client.think(prompt: 'question')
      expect(Open3).to have_received(:popen3) do |*args|
        expect(args).not_to include('--context')
      end
    end

    it 'does not accept a context: keyword' do
      expect { client.think(prompt: 'q', context: 'x') }.to raise_error(ArgumentError)
    end
  end

  # ---------------------------------------------------------------------------
  # subprocess_env — every invocation carries the per-account env hash (P0-5)
  # ---------------------------------------------------------------------------
  describe 'subprocess env hash (Open3.popen3 first arg)' do
    let(:account_client) { described_class.new(42) }

    # The env hash (first popen3 arg) of the most recent invocation.
    def captured_env
      popen3_envs.last
    end

    it 'injects a per-account GBRAIN_HOME (base/<account_id>, no .gbrain suffix)' do
      stub_popen3(stdout: '{}')
      account_client.stats
      expect(captured_env).to be_a(Hash)
      expect(captured_env['GBRAIN_HOME']).to eq(described_class.gbrain_home_for(42))
      expect(captured_env['GBRAIN_HOME']).to end_with(File.join('', '42'))
      expect(captured_env['GBRAIN_HOME']).not_to end_with('.gbrain')
    end

    it 'isolates accounts: different account_id → different GBRAIN_HOME' do
      stub_popen3(stdout: '{}')
      described_class.new(1).stats
      described_class.new(2).stats

      home_one = popen3_envs[0]['GBRAIN_HOME']
      home_two = popen3_envs[1]['GBRAIN_HOME']
      expect(home_one).not_to eq(home_two)
    end

    it 'includes OPENAI_API_KEY and DEEPSEEK_API_KEY when present, never the unread vars' do
      stub_popen3(stdout: '{}')
      ClimateControl.modify(
        OPENAI_API_KEY: 'sk-openai-xyz',
        DEEPSEEK_API_KEY: 'sk-deepseek-xyz',
        DEEPSEEK_BASE_URL: 'https://evil.example',
        DEEPSEEK_MODEL: 'should-be-ignored'
      ) do
        account_client.stats
      end

      env = captured_env
      expect(env['OPENAI_API_KEY']).to eq('sk-openai-xyz')
      expect(env['DEEPSEEK_API_KEY']).to eq('sk-deepseek-xyz')
      expect(env).not_to have_key('DEEPSEEK_BASE_URL')
      expect(env).not_to have_key('DEEPSEEK_MODEL')
    end

    it 'omits keys entirely when the env vars are absent' do
      stub_popen3(stdout: '{}')
      ClimateControl.modify(OPENAI_API_KEY: nil, DEEPSEEK_API_KEY: nil) do
        account_client.stats
      end

      env = captured_env
      expect(env).not_to have_key('OPENAI_API_KEY')
      expect(env).not_to have_key('DEEPSEEK_API_KEY')
    end

    it 'never places an API key in the CLI argv' do
      stub_popen3(stdout: '{}')
      ClimateControl.modify(DEEPSEEK_API_KEY: 'sk-deepseek-secret') do
        account_client.think(prompt: 'sensitive question')
      end

      expect(Open3).to have_received(:popen3) do |_env, *cli_args|
        expect(cli_args).not_to include('sk-deepseek-secret')
        expect(cli_args.join(' ')).not_to include('sk-deepseek-secret')
      end
    end
  end

  describe 'stderr secret redaction' do
    it 'redacts a leaked API key from the SubprocessError message' do
      stub_popen3(stdout: '', stderr: 'auth failed for key sk-leaked-123', exit_status: 1)
      ClimateControl.modify(DEEPSEEK_API_KEY: 'sk-leaked-123') do
        expect { client.stats }.to raise_error(described_class::SubprocessError) do |err|
          expect(err.message).to include('[REDACTED]')
          expect(err.message).not_to include('sk-leaked-123')
        end
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
  # C2 — Integer coercion in initialize (path-traversal guard)
  # ---------------------------------------------------------------------------
  describe '.new account_id coercion' do
    it 'accepts a valid integer account_id' do
      expect { described_class.new(7) }.not_to raise_error
    end

    it 'accepts a numeric string' do
      expect { described_class.new('42') }.not_to raise_error
    end

    it 'raises on a traversal-attempt string like "../99"' do
      expect { described_class.new('../99') }.to raise_error(ArgumentError)
    end

    it 'raises on a non-numeric string' do
      expect { described_class.new('evil') }.to raise_error(ArgumentError)
    end

    it 'raises on nil' do
      expect { described_class.new(nil) }.to raise_error(TypeError)
    end
  end

  # ---------------------------------------------------------------------------
  # C3 — parse_output redacts API keys from JSON parse error message
  # ---------------------------------------------------------------------------
  describe 'parse_output key redaction' do
    it 'redacts a leaked key from a JSON ParseError message in stdout' do
      # A future gbrain version could echo config (including keys) to stdout
      # before crashing — the ParseError message would then contain the key.
      stub_popen3(stdout: 'auth=sk-leaked-stdout-456 invalid json {', exit_status: 0)
      ClimateControl.modify(OPENAI_API_KEY: 'sk-leaked-stdout-456') do
        expect { client.stats }.to raise_error(described_class::SubprocessError) do |err|
          expect(err.message).to include('[REDACTED]')
          expect(err.message).not_to include('sk-leaked-stdout-456')
        end
      end
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
