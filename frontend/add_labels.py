import re

with open('src/pages/Register.tsx', 'r') as f:
    content = f.read()

# First Name
content = re.sub(r'<label className=\{labelClass\}>First Name</label>', '<label htmlFor="firstName" className={labelClass}>First Name</label>', content)
content = re.sub(r'<input name="firstName"([^>]+)>', r'<input id="firstName" name="firstName"\1>', content)

# Last Name
content = re.sub(r'<label className=\{labelClass\}>Last Name</label>', '<label htmlFor="lastName" className={labelClass}>Last Name</label>', content)
content = re.sub(r'<input name="lastName"([^>]+)>', r'<input id="lastName" name="lastName"\1>', content)

# Email Address
content = re.sub(r'<label className=\{labelClass\}>Email Address</label>', '<label htmlFor="email" className={labelClass}>Email Address</label>', content)
content = re.sub(r'<input name="email"([^>]+)>', r'<input id="email" name="email"\1>', content)

# Password
content = re.sub(r'<label className=\{labelClass\}>Password</label>', '<label htmlFor="password" className={labelClass}>Password</label>', content)
content = re.sub(r'<input name="password"([^>]+)>', r'<input id="password" name="password"\1>', content)

# Confirm Password
content = re.sub(r'<label className=\{labelClass\}>Confirm Password</label>', '<label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>', content)
content = re.sub(r'<input name="confirmPassword"([^>]+)>', r'<input id="confirmPassword" name="confirmPassword"\1>', content)

# Date of Birth
content = re.sub(r'<label className=\{labelClass\}>Date of Birth</label>', '<label htmlFor="dateOfBirth" className={labelClass}>Date of Birth</label>', content)
content = re.sub(r'<input name="dateOfBirth"([^>]+)>', r'<input id="dateOfBirth" name="dateOfBirth"\1>', content)

with open('src/pages/Register.tsx', 'w') as f:
    f.write(content)

print("Replacement done.")
