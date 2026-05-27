account = Account.find(1)
account.algorythmo_cut_crm = true
account.save!
puts "OK account=#{account.name} crm=#{account.algorythmo_cut_crm?} cut_flags=#{account.all_algorythmo_cut_flags.select { |_, v| v }.keys.inspect}"
