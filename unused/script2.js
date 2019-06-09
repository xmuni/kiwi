
function fetch_json(url)
{
	fetch(url)
		.then(function(response) {
			return response.json();
		})
		.then(function(data) {
			console.log(data);
			foodlist = data;
		})
		.catch(error => console.error(error))
}


// returns an array of tuples [name,grams]
function get_text_entries(item)
{
	var entries = [];

	var lines = item.value.split('\n');
	// console.log(lines);
	for(var i=0; i<lines.length; i++)
	{
		var pair = split_amount_and_foodname(lines[i]);

		if(pair[0] !="" && pair[1] != "")
		{
			var amount = parse_amount(pair[0]);
			var name = pair[1];
			var new_pair = [name, amount];
			entries.push(new_pair);
		}
		else
		{
			var new_pair = ["", 0];
			entries.push(new_pair);
		}
	}

	// console.log(lines);
	return entries;
}


function create_label_array(entries)
{
	var calories_array = [];
	
	for(var i=0; i<entries.length; i++)
	{
		var foodname = entries[i][0];
		// console.log(foodname);
		if(foodname == "")
		{
			calories_array.push(-1); // empty line
		}
		else if(get_food_match(foodname, foodlist) != "") // best key match in dictionary
		{
			var amount = foodlist[get_food_match(foodname, foodlist)] / 100 * entries[i][1];
			calories_array.push(Math.round(amount));
		}
		else
		{
			calories_array.push(-2); // food not in database
		}
	}

	// console.log(calories_array);
	return calories_array;
}


function set_labels(array)
{
	var labels_div = document.querySelector("#labels");

	// remove all labels
	while (labels_div.firstChild)
	{
	    labels_div.firstChild.remove();
	}

	var html_content = "";
	for(var i=0; i<array.length; i++)
	{
		// console.log(array[i]);
		
		var new_div = document.createElement("div");

		var text = array[i].toString();
		if(array[i] === -1)
			text = "_";
		else if(array[i] === -2)
			text = "?";
		
		new_content = document.createTextNode(text);

		new_div.appendChild(new_content);
		
		// console.log(new_div);

		labels_div.appendChild(new_div);
	}
}


function update_labels()
{
	var entries = get_text_entries(textarea);
	var array = create_label_array(entries);
	set_labels(array);
}

/*
	120		30g chocolate
	150		150kcal
	  _		dinner
	 34		13g cake 200kcal

	- comment entry
	- normal entry lookup
	- manual kcal insert
	- weighted manual entry
*/
function update_labels_singlestep()
{
	// read lines
	// look up value and add to array<string>
	// make label divs
	// set total

	var total = 0;
	var labels = [];

	var lines = textarea.value.split('\n');
	for(var i=0; i<lines.length; i++)
	{
		var words = lines[i].trim().split(' ');
		// console.log(words);

		// empty line, or first word without digits, or line without digits
		if(words.length < 1 || !has_digits(words[0]) || !has_digits(lines[i]))
			labels.push("_");

		// manual calorie entry
		else if(words.length===1 && has_digits(words[0]) || words[0].endsWith("cal")) // 100kcal, 100cal, or 100c
		{
			var firstword = remove_nondigits(words[0]);
			var calories = parseFloat(firstword);

			// if the calories were negative (-300kcal)
			if(words[0].includes('-'))
				calories = -calories;

			total += calories;
			labels.push(Math.round(calories).toString());
		}

		// (at least two words are guaranteed)
		// weighted food (possibly with calories at the end)
		else
		{
			// console.log(words[0]+" -> "+amount);

			// if the calories are specified, use them instead of looking up the food name
			var lastword = words[words.length-1];
			if(has_digits(lastword)
			&&(lastword.endsWith("cal") || lastword.endsWith("c")))
			{
				var amount = parse_amount(words[0]);
				var cal100 = parseFloat(remove_nondigits(lastword));
				var calories = cal100 / 100 * amount;

				total += calories;
				labels.push(Math.round(calories).toString());
			}

			// no calories are indicated, so look up the food name
			else
			{
				var amount = parse_amount(words[0]);

				words.splice(0,1);
				var foodname = words.join(' ');
				var foodkey = get_food_match(foodname, foodlist);

				// if no matching food was found, show a "?"
				if(foodkey=="")
				{
					// console.log("No match found: "+foodname);
					labels.push("?");
				}
				else
				{
					var calories = foodlist[foodkey] / 100 * amount;

					total += calories;
					labels.push(Math.round(calories).toString());
				}
			}

			/*
			var foodname = "";
			// remove first 2 words if they're formatted like "30 g"
			if(word[1].startsWith("g") || word[1].startsWith("kg"))
				foodname = words.splice(0,2).join(' ');
			else // only remove first word if it's like "30g"
				foodname = words.splice(0,1).join(' ');
			*/
		}
		/*
		// anything else, idk
		else
			labels.push("_");
		*/
	}

	set_labels(labels);

	var totalcal_div = document.querySelector("#totalcal h2");
	totalcal_div.innerText = Math.round(total).toString()+" kcal";

	box_total = Math.round(total);
	box_labels = labels;
}


function update_total()
{
	var labels = document.querySelector("#labels").children;
	var total = 0;

	for(var i=0; i<labels.length; i++)
	{
		// console.log(labels[i]);
		if(labels[i].innerText != "_" && labels[i].innerText != "?")
			total += parseFloat(labels[i].innerText);
	}

	var totalcal_div = document.querySelector("#totalcal h2");
	totalcal_div.innerText = total+" kcal";
}


function remove_nondigits(string)
{
	return string.replace(/\D/g,'');
}


function has_digits(string)
{
	return /\d/.test(string);
}


function get_food_match(foodname, dict)
{
	if(dict.hasOwnProperty(foodname))
		return foodname;

	if(foodname.endsWith('s'))
	{
		var singular = foodname.slice(0,-1);
		if(dict.hasOwnProperty(singular))
			return singular;
	}

	for(var key in dict)
		if(dict.hasOwnProperty(key)
		&& key.startsWith(foodname))
			return key;
	
	return "";
}

// split "30g mixed nuts" into ["30g","mixed nuts"]
function split_amount_and_foodname(line)
{
	line = line.trim();
	var amount = "";

	for(var i=0; i<line.length; i++)
	{
		if(line[i]==' ' && amount=="")
		{
			amount = line.slice(0,i); // from start of line to here
		}
		else if(amount != "")
		{
			var foodname = line.slice(i,line.length); // from here to the end of line
			return [amount, foodname];
		}
	}

	return ["",""];
}

function parse_amount(somestring)
{
	if(somestring.includes("kg"))
		return 1000 * parseFloat(somestring.replace("kg",""));
	else
		return parseInt(somestring.replace("g",""));
}


function download(content, fileName, contentType)
{
    var newelement = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    newelement.href = URL.createObjectURL(file);
    newelement.download = fileName;
	newelement.style.display = "none";
	document.body.appendChild(newelement);
    newelement.click();
	document.body.removeChild(newelement);
	setTimeout(function() { URL.revokeObjectURL(newelement.href); }, 1000);
}


function get_date_today()
{
	var date = new Date();

	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	var day = date.getDay();

	var text = `${year}-${month}-${day}`;
	return text;
}


function download_textarea()
{
	var date = get_date_today();
	var text = date+" ("+box_total.toString()+" kcal)\r\n";

	var lines = textarea.value.split('\n');
	for(var i=0; i<lines.length; i++)
		text += "\r\n"+box_labels[i]+"\t"+lines[i];

	console.log(text);
	var filename = "Kiwi "+date+" ("+box_total.toString()+" kcal).txt";
	download(text, filename, 'text/plain');
}


function update()
{
	update_labels();
	update_total();
	// window.clearInterval(timer);
	console.log("Values updated");

	// save all textarea items to local storage
	localStorage.setItem('textbox', JSON.stringify(textarea.value));
}

function update_new()
{
	update_labels_singlestep();
	// console.log("*********************************");
	console.log("Values updated");

	// save all textarea items to local storage
	localStorage.setItem('textbox', JSON.stringify(textarea.value));
}

function set_update_timeout()
{
	if(updating == false)
	{
		updating = true;
		timer = window.setInterval(update_new, 300);
	}

	// after 1 second of no keypresses, disable the updating interval
	window.clearTimeout(timer_sleep);
	timer_sleep = window.setTimeout(function() { window.clearTimeout(timer); updating=false; }, 1000);
}


/******************************************************/
/*                        Main                        */
/******************************************************/


var textarea = document.querySelector("textarea");
var updating = false;
var timer = 0;
var timer_sleep = 0;
var foodlist;
fetch_json("https://engivirus.github.io/kiwi/food.json");

// only used for txt download
var box_total = 0;
var box_labels = [];

// load most recent items into textbox
var savedtext = localStorage.getItem('textbox');
if(savedtext !== null)
	textarea.value = JSON.parse(savedtext);


// stop updating the items after 1 second of not typing
textarea.addEventListener("keyup", set_update_timeout);
set_update_timeout();


