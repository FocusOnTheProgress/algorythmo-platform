email = 'gustavob.inovacao@gmail.com'
password = ENV.fetch('ADMIN_PASS')
account = Account.find_by(name: 'Algorythmo') || Account.create!(name: 'Algorythmo')
user = User.find_by(email: email)
if user.nil?
  user = User.new(name: 'Gustavo', email: email, password: password, password_confirmation: password)
  user.confirmed_at = Time.current
  user.save!
end
account_user = AccountUser.find_by(account: account, user: user) ||
               AccountUser.create!(account: account, user: user, role: :administrator)
puts "OK account_id=#{account.id} user_id=#{user.id} role=#{account_user.role} email=#{user.email}"
