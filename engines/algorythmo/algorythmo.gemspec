require_relative 'lib/algorythmo'

Gem::Specification.new do |spec|
  spec.name        = 'algorythmo'
  spec.version     = Algorythmo::VERSION
  spec.authors     = ['Algorythmo']
  spec.email       = ['gustavob.inovacao@gmail.com']
  spec.homepage    = 'https://algorythmo.com'
  spec.summary     = 'Algorythmo OS — AI-first CRM engine over Chatwoot'
  spec.description = 'Rails engine that adds CRM, Brain and agent capabilities to the Chatwoot fork.'
  spec.license     = 'Proprietary'

  spec.metadata['allowed_push_host'] = 'https://rubygems.pkg.github.com/algorythmo'

  spec.files = Dir.chdir(File.expand_path(__dir__)) do
    Dir['{app,config,db,lib}/**/*', 'LICENSE', 'Rakefile']
  end

  spec.add_dependency 'rails', '~> 7.1'
end
