require_relative 'lib/algorythmo/version'

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

  spec.required_ruby_version = '>= 3.4.0'

  spec.add_dependency 'rails', '~> 7.1'

  # Brain document-upload pipeline (plan 0012 PR3). TEXT-ONLY extraction:
  #   pdf-reader → PDF text layer (no render, no embedded JS)
  #   rubyzip    → unzip docx to read word/document.xml (parsed with nokogiri,
  #                already a transitive dep of the host) — no macro execution
  # Both are mature, pure-Ruby, single-purpose gems. Touched ONLY by DocumentExtractor.
  spec.add_dependency 'pdf-reader', '~> 2.15'
  spec.add_dependency 'rubyzip', '~> 3.3'

  spec.metadata['rubygems_mfa_required'] = 'true'
end
