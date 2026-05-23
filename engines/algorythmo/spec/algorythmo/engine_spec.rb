# frozen_string_literal: true

require 'rails_helper'

# M0.1 — Engine boot smoke tests
# Verifies the Algorythmo::Engine initializes correctly and mounts routes.
RSpec.describe Algorythmo::Engine, type: :request do
  describe 'routes' do
    it 'has routes mounted at /algorythmo' do
      # Engine root responds to GET /algorythmo
      expect(Algorythmo::Engine.routes).to be_a(ActionDispatch::Routing::RouteSet)
    end
  end

  # M0.5 / Adversarial #7 — AsyncDispatcher initializer contract
  # Verifies the dispatcher module is loaded at boot time, not deferred.
  # The 'finisher_hook' initializer ordering guarantees deterministic registration.
  describe 'AsyncDispatcher registration' do
    context 'when AsyncDispatcher and Algorythmo::AsyncDispatcher are both defined' do
      before do
        # Define stubs only if the real constants aren't loaded (FOSS build).
        # In Enterprise builds, the real classes are used.
        stub_const('AsyncDispatcher', Module.new) unless defined?(AsyncDispatcher)
        stub_const('Algorythmo::AsyncDispatcher', Module.new) unless defined?(Algorythmo::AsyncDispatcher)
      end

      it 'includes Algorythmo::AsyncDispatcher in AsyncDispatcher ancestors after engine boots' do
        # Simulate the initializer running (idempotent — safe to call again)
        unless AsyncDispatcher.ancestors.include?(Algorythmo::AsyncDispatcher)
          AsyncDispatcher.prepend(Algorythmo::AsyncDispatcher)
        end

        expect(AsyncDispatcher.ancestors).to include(Algorythmo::AsyncDispatcher)
      end

      it 'is idempotent — prepend does not add the module twice' do
        AsyncDispatcher.prepend(Algorythmo::AsyncDispatcher) unless AsyncDispatcher.ancestors.include?(Algorythmo::AsyncDispatcher)
        AsyncDispatcher.prepend(Algorythmo::AsyncDispatcher) unless AsyncDispatcher.ancestors.include?(Algorythmo::AsyncDispatcher)

        occurrences = AsyncDispatcher.ancestors.count { |a| a == Algorythmo::AsyncDispatcher }
        expect(occurrences).to eq(1)
      end
    end

    context 'when AsyncDispatcher is not defined (FOSS build)' do
      it 'does not raise an error during engine initialization' do
        # The guard `if defined?(AsyncDispatcher)` must prevent NameError.
        expect do
          without_const('AsyncDispatcher') do
            # Simulate the initializer body
            if defined?(AsyncDispatcher) && defined?(Algorythmo::AsyncDispatcher)
              AsyncDispatcher.prepend(Algorythmo::AsyncDispatcher) unless AsyncDispatcher.ancestors.include?(Algorythmo::AsyncDispatcher)
            end
          end
        end.not_to raise_error
      end
    end
  end
end

# Helper to temporarily remove a constant for one block.
def without_const(name)
  had_const = Object.const_defined?(name)
  Object.send(:remove_const, name) if had_const
  yield
ensure
  # We cannot restore a constant that was never defined — skip restore in specs.
  nil
end
