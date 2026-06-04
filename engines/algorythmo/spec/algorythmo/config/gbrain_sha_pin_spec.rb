# frozen_string_literal: true

require 'rails_helper'
require 'json'

# Verifies that GBRAIN_PINNED_SHA (the human-readable source of truth) and
# package.json (the npm runtime install target) reference the exact same SHA.
#
# Why: they are edited independently during a bump (ADR-0013). A divergence means
# the docs say "we tested on SHA X" but `pnpm install` pulls SHA Y — an invisible
# supply-chain mismatch that surfaces only at runtime. This spec makes it loud.
#
# Registered explicitly in .github/workflows/run_foss_spec.yml even though it lives
# under engines/algorythmo/spec/ (already covered by the directory glob) — belt and
# suspenders per the project lesson about CI spec registration.
RSpec.describe 'GBRAIN_PINNED_SHA / package.json SHA parity' do
  let(:engine_root) { Rails.root.join('engines/algorythmo') }

  let(:pinned_sha_file) { engine_root.join('GBRAIN_PINNED_SHA') }
  let(:package_json_file) { engine_root.join('package.json') }

  let(:sha_from_file) { File.read(pinned_sha_file).strip }

  let(:sha_from_package_json) do
    pkg = JSON.parse(File.read(package_json_file))
    gbrain_dep = pkg.dig('dependencies', 'gbrain').to_s
    # Expected format: "garrytan/gbrain#<sha40>"
    gbrain_dep.split('#').last
  end

  it 'GBRAIN_PINNED_SHA file exists and contains a 40-char hex SHA' do
    expect(pinned_sha_file).to exist
    expect(sha_from_file).to match(/\A[0-9a-f]{40}\z/)
  end

  it 'package.json gbrain dependency encodes a 40-char hex SHA' do
    msg = "package.json gbrain dep should be garrytan/gbrain#<sha40>, got: #{sha_from_package_json.inspect}"
    expect(sha_from_package_json).to match(/\A[0-9a-f]{40}\z/), msg
  end

  it 'both SHAs are identical — no silent drift between doc and runtime' do
    msg = "GBRAIN_PINNED_SHA (#{sha_from_file}) diverges from " \
          "package.json (#{sha_from_package_json}). " \
          'Update both files atomically when bumping (ADR-0013).'
    expect(sha_from_file).to eq(sha_from_package_json), msg
  end
end
