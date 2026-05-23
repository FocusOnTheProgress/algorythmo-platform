# frozen_string_literal: true

# Extends the host AsyncDispatcher to register Algorythmo listeners.
# Prepended via Engine initializer — same pattern as Enterprise::AsyncDispatcher.
# algorythmo: auto-create-lead-d6
module Algorythmo::AsyncDispatcher
  # algorythmo: auto-create-lead-d6
  # Appends Algorythmo listeners to the host AsyncDispatcher list.
  # Uses super to preserve all upstream listeners — no destructive override.
  def listeners
    super + [
      Algorythmo::CrmListener.instance
    ]
  end
end
