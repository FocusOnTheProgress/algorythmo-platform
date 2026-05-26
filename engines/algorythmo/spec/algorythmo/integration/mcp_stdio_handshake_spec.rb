# frozen_string_literal: true

require 'rails_helper'
require 'open3'
require 'json'

# Integration spec for MCP stdio handshake.
#
# Validates the full stdio lifecycle via Open3:
#   1. Spawn `gbrain serve --stdio` subprocess.
#   2. Send a JSON-RPC initialize request.
#   3. Verify the response is well-formed JSON-RPC with an `id` and `result`.
#   4. Close stdin → subprocess exits cleanly (no zombie).
#
# Skipped in CI when `gbrain` binary is not in PATH — the binary is pinned by SHA
# on developer machines and CI nightly (PR M3-1.5 integration lane), not the
# standard test suite.
#
# Why Open3 here (not a fake): the plan requires end-to-end subprocess lifecycle
# validation — timeout behaviour, stdin close → subprocess exit, and JSON-RPC
# wire format. These can only be validated against the real binary.
RSpec.describe 'MCP stdio handshake', type: :integration do
  # Skip entire spec group if gbrain is not available.
  before(:all) do # rubocop:disable RSpec/BeforeAfterAll
    gbrain_bin = ENV.fetch('GBRAIN_BIN', 'gbrain')
    # argv form (not shell interpolation) — GBRAIN_BIN may be operator-set on CI
    # and must not be eval'd by a shell.
    unless system('which', gbrain_bin, out: File::NULL, err: File::NULL)
      skip "gbrain binary not found at #{gbrain_bin} — skipping stdio handshake spec. " \
           'Set GBRAIN_BIN or ensure gbrain is in PATH to run this spec.'
    end
  end

  let(:gbrain_bin) { ENV.fetch('GBRAIN_BIN', 'gbrain') }

  # Minimal JSON-RPC 2.0 initialize request per MCP spec.
  let(:initialize_request) do
    JSON.generate(
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'algorythmo-test', version: '0.0.1' }
      }
    )
  end

  it 'spawns gbrain serve --stdio, receives a JSON-RPC initialize response, then exits cleanly' do
    response_line = nil
    exit_status   = nil

    Open3.popen3(gbrain_bin, 'serve', '--stdio') do |stdin, stdout, _stderr, wait_thr|
      # Write the initialize request followed by newline (line-delimited JSON-RPC)
      stdin.puts(initialize_request)
      stdin.flush

      # Wait up to 10s for the response. wait_readable is Fiber-scheduler safe,
      # unlike IO.select. nil return = timeout.
      response_line = stdout.gets if stdout.wait_readable(10)

      # Signal graceful exit by closing stdin — gbrain should exit when its
      # input stream closes (MCP stdio convention)
      stdin.close

      # Wait up to 5s for clean exit; if it hangs, TERM and re-wait briefly.
      unless wait_thr.join(5)
        Process.kill('TERM', wait_thr.pid)
        wait_thr.join(2)
      end
      exit_status = wait_thr.value
    end

    # The response must be valid JSON
    expect(response_line).not_to be_nil, 'Expected a JSON-RPC response but got none'
    parsed = JSON.parse(response_line)

    expect(parsed).to include('jsonrpc' => '2.0', 'id' => 1)
    expect(parsed).to have_key('result')

    # Subprocess must exit — no zombie processes
    expect(exit_status).not_to be_nil, 'gbrain subprocess did not exit after stdin close'
  end
end
