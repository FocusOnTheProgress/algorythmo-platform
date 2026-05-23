# frozen_string_literal: true

# Engine controllers inherit from ActionController::Base (not the host's
# ApplicationController) so the engine stays self-contained and testable.
# Authentication for API controllers will inherit from this base in M1.
class Algorythmo::ApplicationController < ActionController::Base
  # Engine controllers inherit from ActionController::Base (not the host's
  # ApplicationController) so the engine stays self-contained and testable.
  # Authentication for API controllers will inherit from this base in M1.
end
