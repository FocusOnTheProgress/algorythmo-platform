module Algorythmo
  module FeatureGate
    # Returns true if the Algorythmo feature flag is enabled for the given account.
    #
    # @param account [Account] the account to check
    # @param flag_name [String, Symbol] short name WITHOUT the algorythmo_ prefix
    #   e.g. 'campaigns', :help_center
    #
    # Usage:
    #   Algorythmo::FeatureGate.enabled?(account, 'campaigns')   # => false
    #   Algorythmo::FeatureGate.enabled?(account, :crm)          # => true
    #
    # Internally wraps Account#feature_enabled? (Featurable concern) with the
    # mandatory "algorythmo_" prefix so callers never spell out the full flag name.
    def self.enabled?(account, flag_name)
      account.feature_enabled?("algorythmo_#{flag_name}")
    end
  end
end
