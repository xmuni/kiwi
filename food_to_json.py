# Convert food.txt to food.json
# Useful to reuse the same calorie value for multiple translated foods

json_output = "{\n"
json_entry_counter = 0

with open('food.txt', 'r') as textfile:
	for line in textfile.read().splitlines():
		if ',' in line:
			items = line.split(',')
			if len(items) < 3:
				print('Error. Not enough items in line: '+line)
			else:
				# For each name of this food, write one json key with [calories,unit_weight] as value
				for item in items[2:]:
					# json_output += '\t"{}": {},\n'.format(item.strip(), items[0].strip())
					json_output += '\t"{}": [{},{}],\n'.format(item.strip(), items[0].strip(), items[1].strip())
					json_entry_counter += 1

json_output += "}"

# remove last comma
json_output = json_output.replace(',\n}', '\n}')

with open('food.json', 'w', encoding='UTF-8') as jsonfile:
	jsonfile.write(json_output)

print('Done. {} items written to json file'.format(json_entry_counter))
print('Press enter to close')
input()