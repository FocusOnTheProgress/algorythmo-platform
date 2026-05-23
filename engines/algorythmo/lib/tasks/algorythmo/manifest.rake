# frozen_string_literal: true

# algorythmo: rebrand-m0
#
# Generates public/manifest.json from public/manifest.json.template by
# substituting {{INSTALLATION_NAME}} and {{BRAND_NAME}} with values from ENV.
#
# Why build-time and not a Rails controller?
# PWA manifests are fetched and cached by browsers independently of the HTML page.
# A dynamic route serving manifest.json would be cached stale by the service worker
# or browser, causing the old name to persist until cache expiry. Build-time
# generation via this rake task ensures the manifest is always in sync with the
# deployed ENV — no cache invalidation problem.
#
# This task is invoked automatically during `assets:precompile` so CI and Docker
# builds produce the correct manifest without manual steps.
#
# Usage:
#   bundle exec rake algorythmo:manifest:generate
#   (or via assets:precompile hook below)
#
namespace :algorythmo do
  namespace :manifest do
    desc 'Generate public/manifest.json from public/manifest.json.template using ENV vars'
    task :generate do
      template_path = Rails.root.join('public', 'manifest.json.template')
      output_path   = Rails.root.join('public', 'manifest.json')

      unless template_path.exist?
        warn "[algorythmo:manifest] Template not found at #{template_path} — skipping"
        next
      end

      installation_name = ENV.fetch('INSTALLATION_NAME', 'Algorythmo OS')
      brand_name        = ENV.fetch('BRAND_NAME', 'Algorythmo OS')

      content = template_path.read
                             .gsub('{{INSTALLATION_NAME}}', installation_name)
                             .gsub('{{BRAND_NAME}}', brand_name)

      output_path.write(content)
      puts "[algorythmo:manifest] Generated #{output_path} (name: #{installation_name})"
    end
  end
end

# Hook into asset precompile so Docker builds and CI never ship a stale manifest.
if Rake::Task.task_defined?('assets:precompile')
  Rake::Task['assets:precompile'].enhance do
    Rake::Task['algorythmo:manifest:generate'].invoke
  end
end
