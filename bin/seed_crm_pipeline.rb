account = Account.find(1)
existing = Algorythmo::Pipeline.exists?(account: account)
if existing
  pipeline = Algorythmo::Pipeline.where(account: account).first
  puts "OK already_seeded account=#{account.id} pipeline_id=#{pipeline.id} stages=#{pipeline.stages.count}"
else
  pipeline = Algorythmo::Pipeline.create!(account: account, name: 'Pipeline Principal')
  [
    { name: 'Novo',            kind: :open, position: 0, aging_coefficient: 1.0 },
    { name: 'Qualificado',     kind: :open, position: 1, aging_coefficient: 4.0 },
    { name: 'Proposta',        kind: :open, position: 2, aging_coefficient: 7.0 },
    { name: 'Fechado ganho',   kind: :won,  position: 3, aging_coefficient: 0.0 },
    { name: 'Fechado perdido', kind: :lost, position: 4, aging_coefficient: 0.0 }
  ].each do |attrs|
    Algorythmo::Stage.create!(pipeline: pipeline, **attrs)
  end
  puts "OK seeded account=#{account.id} pipeline_id=#{pipeline.id} stages=#{pipeline.stages.count}"
end
