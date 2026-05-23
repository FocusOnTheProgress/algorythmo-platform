# frozen_string_literal: true

module Algorythmo
  # Extends the host AsyncDispatcher to register Algorythmo listeners.
  # Prepended via Engine initializer — same pattern as Enterprise::AsyncDispatcher.
  # algorythmo: auto-create-lead-d6
  module AsyncDispatcher
    def listeners
      super + [
        # M0: no listeners yet — placeholder for CrmListener added in M1/Trilha A.
        # Algorythmo::CrmListener.instance
      ]
    end
  end
end
