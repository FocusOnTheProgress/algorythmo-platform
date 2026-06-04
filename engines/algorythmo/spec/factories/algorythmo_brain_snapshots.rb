# frozen_string_literal: true

FactoryBot.define do
  factory :algorythmo_brain_snapshot, class: 'Algorythmo::Brain::Snapshot' do
    association :account

    taken_at     { Time.current }
    stats        { { 'pages' => 5, 'edges' => 12 } }
    diff_summary { 'pages: 4→5 (+1); edges: 10→12 (+2)' }
    trigger      { 'cron' }
  end
end
