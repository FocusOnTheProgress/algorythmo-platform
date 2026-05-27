account = Account.find(1)
features = %w[algorythmo_crm algorythmo_brain]
features.each { |f| account.enable_features(f) }
account.save!
puts "OK account=#{account.name} features=#{features.select { |f| account.feature_enabled?(f) }.inspect}"
