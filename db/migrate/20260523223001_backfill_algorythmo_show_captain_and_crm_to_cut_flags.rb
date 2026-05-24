# frozen_string_literal: true

# Backfills algorythmo_show_captain (old features.yml pos 64) and algorythmo_crm (pos 65)
# into the new algorythmo_feature_flags column at positions 14 and 15.
#
# Position 64 in a signed bigint means bit 63 (the sign bit). Any account with that
# flag enabled would have feature_flags < 0. We detect this and set bit 13 (pos 14)
# in algorythmo_feature_flags accordingly.
#
# Position 65 is entirely out of signed bigint range (2^64 — unrepresentable).
# No reliable data could have been stored there; crm (pos 15) is left at 0.
class BackfillAlgorythmoShowCaptainAndCrmToCutFlags < ActiveRecord::Migration[7.1]
  # Position 14 in algorythmo_feature_flags = bit index 13 (0-based) = 2^13 = 8192
  SHOW_CAPTAIN_NEW_BIT = 2**13

  def up
    # Accounts where feature_flags sign bit was set = algorythmo_show_captain was "enabled"
    execute(<<~SQL.squish)
      UPDATE accounts
      SET algorythmo_feature_flags = algorythmo_feature_flags | #{SHOW_CAPTAIN_NEW_BIT}
      WHERE feature_flags < 0
        AND (algorythmo_feature_flags & #{SHOW_CAPTAIN_NEW_BIT}) = 0
    SQL
  end

  def down
    execute(<<~SQL.squish)
      UPDATE accounts
      SET algorythmo_feature_flags = algorythmo_feature_flags & ~#{SHOW_CAPTAIN_NEW_BIT}
    SQL
  end
end
