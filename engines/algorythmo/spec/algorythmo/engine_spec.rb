# frozen_string_literal: true

require 'spec_helper'

# M0.1 — Engine boot smoke tests
# Verifies the Algorythmo::Engine initializes correctly and mounts routes.
RSpec.describe Algorythmo::Engine, type: :request do
  describe 'routes' do
    it 'has routes mounted at /algorythmo' do
      # Engine root responds to GET /algorythmo
      expect(Algorythmo::Engine.routes).to be_a(ActionDispatch::Routing::RouteSet)
    end
  end
end
