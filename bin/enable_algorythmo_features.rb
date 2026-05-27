account = Account.find(1)
account.algorythmo_cut_crm = true
account.algorythmo_cut_brain = true
account.save!
puts "OK account=#{account.name} crm=#{account.algorythmo_cut_crm?} brain=#{account.algorythmo_cut_brain?} cut_flags=#{account.all_algorythmo_cut_flags.select { |_, v| v }.keys.inspect}"
