"""Build a large Quiz Night question bank into games/quiznight.json."""
from __future__ import annotations

import json
import random
import string
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "games" / "quiznight.json"
rng = random.Random(11)


def q(prompt, choices, answer, kind="trivia"):
    opts = list(choices)
    if answer not in opts:
        opts[0] = answer
    rng.shuffle(opts)
    # keep four unique
    seen = []
    for c in opts:
        if c not in seen:
            seen.append(c)
        if len(seen) == 4:
            break
    while len(seen) < 4:
        seen.append(str(len(seen)))
    return {
        "q": prompt,
        "choices": seen,
        "answerIndex": seen.index(answer),
        "kind": kind,
    }


def scramble(word):
    letters = list(word)
    for _ in range(20):
        rng.shuffle(letters)
        s = "".join(letters)
        if s != word:
            return s
    return word[1:] + word[0]


CAPITALS = [
    ("France", "Paris", ["Lyon", "Marseille", "Nice"]),
    ("Italy", "Rome", ["Milan", "Naples", "Venice"]),
    ("Spain", "Madrid", ["Barcelona", "Seville", "Valencia"]),
    ("Germany", "Berlin", ["Munich", "Hamburg", "Frankfurt"]),
    ("United Kingdom", "London", ["Manchester", "Edinburgh", "Liverpool"]),
    ("Ireland", "Dublin", ["Cork", "Galway", "Belfast"]),
    ("Portugal", "Lisbon", ["Porto", "Braga", "Faro"]),
    ("Greece", "Athens", ["Thessaloniki", "Patras", "Rhodes"]),
    ("Belgium", "Brussels", ["Antwerp", "Ghent", "Bruges"]),
    ("Netherlands", "Amsterdam", ["Rotterdam", "The Hague", "Utrecht"]),
    ("Sweden", "Stockholm", ["Gothenburg", "Malmo", "Uppsala"]),
    ("Norway", "Oslo", ["Bergen", "Trondheim", "Stavanger"]),
    ("Denmark", "Copenhagen", ["Aarhus", "Odense", "Aalborg"]),
    ("Finland", "Helsinki", ["Tampere", "Turku", "Oulu"]),
    ("Poland", "Warsaw", ["Krakow", "Gdansk", "Wroclaw"]),
    ("Czechia", "Prague", ["Brno", "Ostrava", "Plzen"]),
    ("Austria", "Vienna", ["Salzburg", "Graz", "Innsbruck"]),
    ("Switzerland", "Bern", ["Zurich", "Geneva", "Basel"]),
    ("Hungary", "Budapest", ["Debrecen", "Szeged", "Pecs"]),
    ("Romania", "Bucharest", ["Cluj", "Timisoara", "Iasi"]),
    ("Ukraine", "Kyiv", ["Lviv", "Odesa", "Kharkiv"]),
    ("Russia", "Moscow", ["Saint Petersburg", "Kazan", "Sochi"]),
    ("Turkey", "Ankara", ["Istanbul", "Izmir", "Antalya"]),
    ("Egypt", "Cairo", ["Alexandria", "Giza", "Luxor"]),
    ("Morocco", "Rabat", ["Casablanca", "Marrakesh", "Fes"]),
    ("Kenya", "Nairobi", ["Mombasa", "Kisumu", "Nakuru"]),
    ("Nigeria", "Abuja", ["Lagos", "Kano", "Ibadan"]),
    ("South Africa", "Pretoria", ["Cape Town", "Johannesburg", "Durban"]),
    ("Ethiopia", "Addis Ababa", ["Dire Dawa", "Mekelle", "Gondar"]),
    ("Ghana", "Accra", ["Kumasi", "Tamale", "Tema"]),
    ("Canada", "Ottawa", ["Toronto", "Montreal", "Vancouver"]),
    ("Mexico", "Mexico City", ["Guadalajara", "Monterrey", "Cancun"]),
    ("Brazil", "Brasilia", ["Rio de Janeiro", "Sao Paulo", "Salvador"]),
    ("Argentina", "Buenos Aires", ["Cordoba", "Rosario", "Mendoza"]),
    ("Chile", "Santiago", ["Valparaiso", "Concepcion", "Antofagasta"]),
    ("Peru", "Lima", ["Cusco", "Arequipa", "Trujillo"]),
    ("Colombia", "Bogota", ["Medellin", "Cali", "Cartagena"]),
    ("Japan", "Tokyo", ["Osaka", "Kyoto", "Yokohama"]),
    ("China", "Beijing", ["Shanghai", "Guangzhou", "Shenzhen"]),
    ("India", "New Delhi", ["Mumbai", "Kolkata", "Chennai"]),
    ("South Korea", "Seoul", ["Busan", "Incheon", "Daegu"]),
    ("North Korea", "Pyongyang", ["Kaesong", "Wonsan", "Hamhung"]),
    ("Thailand", "Bangkok", ["Chiang Mai", "Phuket", "Pattaya"]),
    ("Vietnam", "Hanoi", ["Ho Chi Minh City", "Da Nang", "Hue"]),
    ("Indonesia", "Jakarta", ["Bali", "Surabaya", "Bandung"]),
    ("Philippines", "Manila", ["Cebu", "Davao", "Quezon City"]),
    ("Australia", "Canberra", ["Sydney", "Melbourne", "Brisbane"]),
    ("New Zealand", "Wellington", ["Auckland", "Christchurch", "Dunedin"]),
    ("Israel", "Jerusalem", ["Tel Aviv", "Haifa", "Eilat"]),
    ("Saudi Arabia", "Riyadh", ["Jeddah", "Mecca", "Medina"]),
    ("Iran", "Tehran", ["Isfahan", "Shiraz", "Tabriz"]),
    ("Iraq", "Baghdad", ["Basra", "Mosul", "Erbil"]),
    ("Pakistan", "Islamabad", ["Karachi", "Lahore", "Peshawar"]),
    ("Afghanistan", "Kabul", ["Kandahar", "Herat", "Mazar-i-Sharif"]),
    ("Iceland", "Reykjavik", ["Akureyri", "Keflavik", "Husavik"]),
    ("Cuba", "Havana", ["Santiago", "Camaguey", "Holguin"]),
    ("Jamaica", "Kingston", ["Montego Bay", "Spanish Town", "Ocho Rios"]),
    ("Haiti", "Port-au-Prince", ["Cap-Haitien", "Gonaives", "Les Cayes"]),
    ("Croatia", "Zagreb", ["Split", "Dubrovnik", "Rijeka"]),
    ("Serbia", "Belgrade", ["Novi Sad", "Nis", "Kragujevac"]),
    ("Bulgaria", "Sofia", ["Plovdiv", "Varna", "Burgas"]),
    ("Slovakia", "Bratislava", ["Kosice", "Presov", "Zilina"]),
    ("Slovenia", "Ljubljana", ["Maribor", "Celje", "Koper"]),
    ("Estonia", "Tallinn", ["Tartu", "Narva", "Parnu"]),
    ("Latvia", "Riga", ["Daugavpils", "Liepaja", "Jelgava"]),
    ("Lithuania", "Vilnius", ["Kaunas", "Klaipeda", "Siauliai"]),
    ("Luxembourg", "Luxembourg", ["Esch", "Differdange", "Dudelange"]),
    ("Monaco", "Monaco", ["Monte Carlo", "La Condamine", "Fontvieille"]),
    ("Vatican City", "Vatican City", ["Rome", "Ostia", "Tivoli"]),
    ("Singapore", "Singapore", ["Jurong", "Woodlands", "Tampines"]),
    ("Malaysia", "Kuala Lumpur", ["Penang", "Johor Bahru", "Malacca"]),
    ("Nepal", "Kathmandu", ["Pokhara", "Lalitpur", "Biratnagar"]),
    ("Bangladesh", "Dhaka", ["Chittagong", "Khulna", "Rajshahi"]),
    ("Sri Lanka", "Sri Jayawardenepura Kotte", ["Colombo", "Kandy", "Galle"]),
    ("Mongolia", "Ulaanbaatar", ["Erdenet", "Darkhan", "Choibalsan"]),
    ("Kazakhstan", "Astana", ["Almaty", "Shymkent", "Karaganda"]),
    ("Uzbekistan", "Tashkent", ["Samarkand", "Bukhara", "Namangan"]),
]

US_CAPS = [
    ("Alabama", "Montgomery", ["Birmingham", "Mobile", "Huntsville"]),
    ("Alaska", "Juneau", ["Anchorage", "Fairbanks", "Sitka"]),
    ("Arizona", "Phoenix", ["Tucson", "Mesa", "Flagstaff"]),
    ("Arkansas", "Little Rock", ["Fayetteville", "Fort Smith", "Jonesboro"]),
    ("California", "Sacramento", ["Los Angeles", "San Francisco", "San Diego"]),
    ("Colorado", "Denver", ["Colorado Springs", "Boulder", "Aspen"]),
    ("Connecticut", "Hartford", ["New Haven", "Stamford", "Bridgeport"]),
    ("Delaware", "Dover", ["Wilmington", "Newark", "Lewes"]),
    ("Florida", "Tallahassee", ["Miami", "Orlando", "Tampa"]),
    ("Georgia", "Atlanta", ["Savannah", "Augusta", "Macon"]),
    ("Hawaii", "Honolulu", ["Hilo", "Kailua", "Lahaina"]),
    ("Idaho", "Boise", ["Idaho Falls", "Coeur d'Alene", "Pocatello"]),
    ("Illinois", "Springfield", ["Chicago", "Peoria", "Rockford"]),
    ("Indiana", "Indianapolis", ["Fort Wayne", "Bloomington", "Gary"]),
    ("Iowa", "Des Moines", ["Cedar Rapids", "Iowa City", "Davenport"]),
    ("Kansas", "Topeka", ["Wichita", "Kansas City", "Lawrence"]),
    ("Kentucky", "Frankfort", ["Louisville", "Lexington", "Bowling Green"]),
    ("Louisiana", "Baton Rouge", ["New Orleans", "Shreveport", "Lafayette"]),
    ("Maine", "Augusta", ["Portland", "Bangor", "Bar Harbor"]),
    ("Maryland", "Annapolis", ["Baltimore", "Frederick", "Rockville"]),
    ("Massachusetts", "Boston", ["Cambridge", "Worcester", "Springfield"]),
    ("Michigan", "Lansing", ["Detroit", "Grand Rapids", "Ann Arbor"]),
    ("Minnesota", "Saint Paul", ["Minneapolis", "Duluth", "Rochester"]),
    ("Mississippi", "Jackson", ["Biloxi", "Gulfport", "Hattiesburg"]),
    ("Missouri", "Jefferson City", ["St. Louis", "Kansas City", "Springfield"]),
    ("Montana", "Helena", ["Billings", "Missoula", "Bozeman"]),
    ("Nebraska", "Lincoln", ["Omaha", "Grand Island", "Kearney"]),
    ("Nevada", "Carson City", ["Las Vegas", "Reno", "Henderson"]),
    ("New Hampshire", "Concord", ["Manchester", "Nashua", "Portsmouth"]),
    ("New Jersey", "Trenton", ["Newark", "Jersey City", "Atlantic City"]),
    ("New Mexico", "Santa Fe", ["Albuquerque", "Las Cruces", "Roswell"]),
    ("New York", "Albany", ["New York City", "Buffalo", "Rochester"]),
    ("North Carolina", "Raleigh", ["Charlotte", "Asheville", "Durham"]),
    ("North Dakota", "Bismarck", ["Fargo", "Grand Forks", "Minot"]),
    ("Ohio", "Columbus", ["Cleveland", "Cincinnati", "Toledo"]),
    ("Oklahoma", "Oklahoma City", ["Tulsa", "Norman", "Broken Arrow"]),
    ("Oregon", "Salem", ["Portland", "Eugene", "Bend"]),
    ("Pennsylvania", "Harrisburg", ["Philadelphia", "Pittsburgh", "Erie"]),
    ("Rhode Island", "Providence", ["Newport", "Warwick", "Pawtucket"]),
    ("South Carolina", "Columbia", ["Charleston", "Greenville", "Myrtle Beach"]),
    ("South Dakota", "Pierre", ["Sioux Falls", "Rapid City", "Aberdeen"]),
    ("Tennessee", "Nashville", ["Memphis", "Knoxville", "Chattanooga"]),
    ("Texas", "Austin", ["Houston", "Dallas", "San Antonio"]),
    ("Utah", "Salt Lake City", ["Provo", "Ogden", "Moab"]),
    ("Vermont", "Montpelier", ["Burlington", "Rutland", "Stowe"]),
    ("Virginia", "Richmond", ["Virginia Beach", "Norfolk", "Charlottesville"]),
    ("Washington", "Olympia", ["Seattle", "Spokane", "Tacoma"]),
    ("West Virginia", "Charleston", ["Morgantown", "Huntington", "Wheeling"]),
    ("Wisconsin", "Madison", ["Milwaukee", "Green Bay", "Eau Claire"]),
    ("Wyoming", "Cheyenne", ["Jackson", "Casper", "Laramie"]),
]

ELEMENTS = [
    ("H", "Hydrogen"), ("He", "Helium"), ("Li", "Lithium"), ("Be", "Beryllium"),
    ("B", "Boron"), ("C", "Carbon"), ("N", "Nitrogen"), ("O", "Oxygen"),
    ("F", "Fluorine"), ("Ne", "Neon"), ("Na", "Sodium"), ("Mg", "Magnesium"),
    ("Al", "Aluminum"), ("Si", "Silicon"), ("P", "Phosphorus"), ("S", "Sulfur"),
    ("Cl", "Chlorine"), ("Ar", "Argon"), ("K", "Potassium"), ("Ca", "Calcium"),
    ("Fe", "Iron"), ("Cu", "Copper"), ("Zn", "Zinc"), ("Ag", "Silver"),
    ("Au", "Gold"), ("Hg", "Mercury"), ("Pb", "Lead"), ("Sn", "Tin"),
    ("I", "Iodine"), ("U", "Uranium"), ("Pt", "Platinum"), ("Ni", "Nickel"),
    ("Co", "Cobalt"), ("Mn", "Manganese"), ("Cr", "Chromium"), ("W", "Tungsten"),
    ("Ti", "Titanium"), ("Ne", "Neon"),
]

PLANETS = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]

AUTHORS = [
    ("Pride and Prejudice", "Jane Austen", ["Charlotte Bronte", "George Eliot", "Emily Bronte"]),
    ("Moby-Dick", "Herman Melville", ["Mark Twain", "Nathaniel Hawthorne", "Edgar Allan Poe"]),
    ("1984", "George Orwell", ["Aldous Huxley", "Ray Bradbury", "H. G. Wells"]),
    ("The Hobbit", "J. R. R. Tolkien", ["C. S. Lewis", "J. K. Rowling", "Philip Pullman"]),
    ("Hamlet", "William Shakespeare", ["Christopher Marlowe", "Ben Jonson", "John Milton"]),
    ("The Odyssey", "Homer", ["Virgil", "Sophocles", "Ovid"]),
    ("Don Quixote", "Miguel de Cervantes", ["Lope de Vega", "Gabriel Garcia Marquez", "Pablo Neruda"]),
    ("War and Peace", "Leo Tolstoy", ["Fyodor Dostoevsky", "Anton Chekhov", "Nikolai Gogol"]),
    ("The Great Gatsby", "F. Scott Fitzgerald", ["Ernest Hemingway", "John Steinbeck", "William Faulkner"]),
    ("To Kill a Mockingbird", "Harper Lee", ["Toni Morrison", "Maya Angelou", "Zora Neale Hurston"]),
    ("Frankenstein", "Mary Shelley", ["Bram Stoker", "Jane Austen", "Ann Radcliffe"]),
    ("Dracula", "Bram Stoker", ["Mary Shelley", "Edgar Allan Poe", "H. P. Lovecraft"]),
    ("The Catcher in the Rye", "J. D. Salinger", ["Jack Kerouac", "John Updike", "Philip Roth"]),
    ("Jane Eyre", "Charlotte Bronte", ["Emily Bronte", "Jane Austen", "George Eliot"]),
    ("Wuthering Heights", "Emily Bronte", ["Charlotte Bronte", "Anne Bronte", "Jane Austen"]),
]

INVENTIONS = [
    ("telephone", "Alexander Graham Bell", ["Thomas Edison", "Nikola Tesla", "Guglielmo Marconi"]),
    ("light bulb (practical)", "Thomas Edison", ["Nikola Tesla", "Benjamin Franklin", "Michael Faraday"]),
    ("theory of relativity", "Albert Einstein", ["Isaac Newton", "Niels Bohr", "Max Planck"]),
    ("printing press", "Johannes Gutenberg", ["Benjamin Franklin", "James Watt", "Galileo"]),
    ("World Wide Web", "Tim Berners-Lee", ["Bill Gates", "Steve Jobs", "Alan Turing"]),
    ("airplane", "Wright brothers", ["Charles Lindbergh", "Amelia Earhart", "Howard Hughes"]),
    ("penicillin", "Alexander Fleming", ["Louis Pasteur", "Jonas Salk", "Edward Jenner"]),
    ("polio vaccine", "Jonas Salk", ["Alexander Fleming", "Louis Pasteur", "Edward Jenner"]),
]

SPORTS = [
    ("How many players are on the court for one basketball team?", "5", ["6", "7", "11"]),
    ("How many players from one soccer team are on the field?", "11", ["9", "10", "12"]),
    ("How many points is a touchdown worth in American football (no extra)?", "6", ["3", "7", "2"]),
    ("How many holes are on a standard golf course?", "18", ["9", "12", "21"]),
    ("How many innings are in a regulation baseball game?", "9", ["7", "8", "10"]),
    ("In tennis, what comes after deuce if a player wins the next point?", "Advantage", ["Game", "Set", "Love"]),
    ("How many Grand Slam tennis tournaments are played each year?", "4", ["3", "5", "2"]),
    ("What sport uses a shuttlecock?", "Badminton", ["Tennis", "Squash", "Racquetball"]),
    ("How many players are on the ice for one hockey team (skaters + goalie)?", "6", ["5", "7", "11"]),
    ("In bowling, how many pins are set up?", "10", ["9", "12", "8"]),
    ("A marathon is about how many miles?", "26.2", ["13.1", "10", "50"]),
    ("How many points is a free throw worth in basketball?", "1", ["2", "3", "0"]),
    ("How many points is a three-pointer worth in basketball?", "3", ["2", "1", "4"]),
    ("What color flag ends a Formula 1 race?", "Checkered", ["Red", "Yellow", "Green"]),
    ("In baseball, how many strikes make an out?", "3", ["2", "4", "1"]),
    ("In baseball, how many balls make a walk?", "4", ["3", "2", "5"]),
    ("The Super Bowl is the championship of which sport?", "American football", ["Baseball", "Soccer", "Hockey"]),
    ("FIFA World Cup is contested in which sport?", "Soccer", ["Rugby", "Cricket", "Tennis"]),
    ("Wimbledon is a championship in which sport?", "Tennis", ["Golf", "Cricket", "Polo"]),
    ("The Stanley Cup is awarded in which sport?", "Ice hockey", ["Football", "Basketball", "Lacrosse"]),
]

SCIENCE = [
    ("What is the chemical symbol for gold?", "Au", ["Ag", "Gd", "Go"]),
    ("What is the chemical symbol for silver?", "Ag", ["Au", "Si", "Sv"]),
    ("What is the chemical symbol for iron?", "Fe", ["Ir", "In", "I"]),
    ("What is the chemical symbol for sodium?", "Na", ["So", "S", "Sd"]),
    ("What gas do plants absorb for photosynthesis?", "Carbon dioxide", ["Oxygen", "Nitrogen", "Hydrogen"]),
    ("What gas do plants release during photosynthesis?", "Oxygen", ["Carbon dioxide", "Nitrogen", "Helium"]),
    ("How many bones are in an adult human body?", "206", ["201", "180", "300"]),
    ("What is the hardest natural mineral?", "Diamond", ["Quartz", "Granite", "Topaz"]),
    ("Sound travels fastest through which of these?", "Steel", ["Air", "Water", "Vacuum"]),
    ("What is the boiling point of water at sea level in Celsius?", "100", ["0", "32", "212"]),
    ("What is the freezing point of water in Celsius?", "0", ["32", "100", "-10"]),
    ("Earth's atmosphere is mostly which gas?", "Nitrogen", ["Oxygen", "Carbon dioxide", "Argon"]),
    ("Which blood cells help fight infection?", "White blood cells", ["Red blood cells", "Platelets", "Plasma"]),
    ("DNA stands for deoxyribonucleic…?", "acid", ["atom", "agent", "alloy"]),
    ("The speed of light is about 300,000 km per…?", "second", ["minute", "hour", "day"]),
    ("What force pulls objects toward Earth?", "Gravity", ["Magnetism", "Friction", "Inertia"]),
    ("Which planet is known as the Red Planet?", "Mars", ["Venus", "Jupiter", "Mercury"]),
    ("Which planet has prominent rings?", "Saturn", ["Jupiter", "Uranus", "Neptune"]),
    ("The Moon orbits which body?", "Earth", ["Sun", "Mars", "Venus"]),
    ("How many planets are in the Solar System (IAU, 2006)?", "8", ["9", "7", "10"]),
    ("What is the center of an atom called?", "Nucleus", ["Electron", "Proton cloud", "Neutrino"]),
    ("Electrons have what electric charge?", "Negative", ["Positive", "Neutral", "Variable"]),
    ("Protons have what electric charge?", "Positive", ["Negative", "Neutral", "None"]),
    ("A light-year measures what?", "Distance", ["Time", "Brightness", "Mass"]),
    ("Which organ filters blood and makes urine?", "Kidneys", ["Liver", "Lungs", "Spleen"]),
    ("Which organ produces insulin?", "Pancreas", ["Liver", "Kidney", "Thyroid"]),
    ("How many chambers does a human heart have?", "4", ["2", "3", "5"]),
    ("What vitamin is produced in skin from sunlight?", "Vitamin D", ["Vitamin C", "Vitamin A", "Vitamin B12"]),
    ("Scurvy is caused by a lack of which vitamin?", "Vitamin C", ["Vitamin D", "Vitamin A", "Vitamin K"]),
    ("What is the most abundant gas in Earth's air?", "Nitrogen", ["Oxygen", "CO2", "Hydrogen"]),
]

GEO = [
    ("Which is the longest river in the world (commonly listed)?", "Nile", ["Amazon", "Mississippi", "Yangtze"]),
    ("Which is the largest ocean?", "Pacific", ["Atlantic", "Indian", "Arctic"]),
    ("Which is the smallest ocean?", "Arctic", ["Indian", "Southern", "Atlantic"]),
    ("Mount Everest is on the border of Nepal and…?", "China", ["India", "Bhutan", "Pakistan"]),
    ("The Amazon rainforest is mostly in which country?", "Brazil", ["Peru", "Colombia", "Venezuela"]),
    ("The Sahara is on which continent?", "Africa", ["Asia", "Australia", "South America"]),
    ("The Andes are in which continent?", "South America", ["North America", "Asia", "Europe"]),
    ("The Alps are primarily in which continent?", "Europe", ["Asia", "Africa", "Australia"]),
    ("Which US state is the Grand Canyon in?", "Arizona", ["Utah", "Nevada", "Colorado"]),
    ("Niagara Falls sits between the US and…?", "Canada", ["Mexico", "Cuba", "Greenland"]),
    ("The Great Barrier Reef is off which country?", "Australia", ["Indonesia", "Philippines", "New Zealand"]),
    ("Which desert is the largest hot desert?", "Sahara", ["Gobi", "Kalahari", "Mojave"]),
    ("The Dead Sea borders Israel and…?", "Jordan", ["Egypt", "Syria", "Lebanon"]),
    ("Istanbul straddles which two continents?", "Europe and Asia", ["Africa and Europe", "Asia and Africa", "Europe and Africa"]),
    ("The Panama Canal connects the Atlantic to the…?", "Pacific", ["Indian Ocean", "Caribbean only", "Arctic"]),
    ("Which continent is also a country?", "Australia", ["Africa", "Europe", "Antarctica"]),
    ("The equator crosses which ocean besides the Atlantic and Indian?", "Pacific", ["Arctic", "Southern only", "Caspian"]),
    ("Lake Superior is one of the…?", "Great Lakes", ["Finger Lakes", "Salt Lakes", "Crater Lakes"]),
    ("The Mississippi River empties into the…?", "Gulf of Mexico", ["Atlantic Ocean", "Pacific Ocean", "Hudson Bay"]),
    ("Which island is the largest?", "Greenland", ["Madagascar", "Borneo", "New Guinea"]),
]

HISTORY = [
    ("In which year did the United States declare independence?", "1776", ["1787", "1812", "1492"]),
    ("Who was the first President of the United States?", "George Washington", ["John Adams", "Thomas Jefferson", "Benjamin Franklin"]),
    ("Who wrote the Declaration of Independence (principal author)?", "Thomas Jefferson", ["John Hancock", "James Madison", "Alexander Hamilton"]),
    ("In which year did World War II end in Europe (VE Day year)?", "1945", ["1944", "1939", "1918"]),
    ("In which year did World War I end?", "1918", ["1914", "1920", "1939"]),
    ("The Berlin Wall fell in which year?", "1989", ["1991", "1985", "1979"]),
    ("Neil Armstrong walked on the Moon in which year?", "1969", ["1961", "1972", "1957"]),
    ("The first man-made satellite was…?", "Sputnik 1", ["Apollo 11", "Voyager 1", "Hubble"]),
    ("Who was known as the Maid of Orleans?", "Joan of Arc", ["Marie Antoinette", "Catherine de Medici", "Eleanor of Aquitaine"]),
    ("Which empire built the Colosseum?", "Roman", ["Greek", "Ottoman", "Byzantine"]),
    ("The Magna Carta was sealed in which century?", "13th", ["10th", "15th", "18th"]),
    ("Who was the British Prime Minister for most of WWII?", "Winston Churchill", ["Neville Chamberlain", "Clement Attlee", "Margaret Thatcher"]),
    ("The Renaissance began in which country?", "Italy", ["France", "Spain", "England"]),
    ("Which civilization built Machu Picchu?", "Inca", ["Maya", "Aztec", "Olmec"]),
    ("Which civilization built Chichen Itza?", "Maya", ["Inca", "Aztec", "Olmec"]),
    ("The Titanic sank in which year?", "1912", ["1905", "1920", "1898"]),
    ("The US Civil War began in which year?", "1861", ["1776", "1812", "1870"]),
    ("Abraham Lincoln was President during which war?", "US Civil War", ["Revolutionary War", "War of 1812", "Spanish-American War"]),
    ("Who painted the Mona Lisa?", "Leonardo da Vinci", ["Michelangelo", "Raphael", "Donatello"]),
    ("Who painted the Sistine Chapel ceiling?", "Michelangelo", ["Leonardo da Vinci", "Raphael", "Caravaggio"]),
    ("The Great Fire of London was in which year?", "1666", ["1660", "1700", "1555"]),
    ("The French Revolution began in which year?", "1789", ["1776", "1815", "1848"]),
    ("Napoleon was defeated at Waterloo in which year?", "1815", ["1805", "1799", "1821"]),
    ("The first iPhone was released in which year?", "2007", ["2005", "2009", "2010"]),
    ("The World Wide Web was invented around which year?", "1989", ["1975", "1995", "2001"]),
]

MISC = [
    ("How many minutes are in one hour?", "60", ["30", "90", "45"]),
    ("How many hours are in one day?", "24", ["12", "36", "48"]),
    ("How many days are in a common year?", "365", ["364", "366", "360"]),
    ("How many days are in a leap year?", "366", ["365", "364", "360"]),
    ("How many weeks are in a year (approx.)?", "52", ["48", "50", "60"]),
    ("How many months have 31 days?", "7", ["6", "5", "8"]),
    ("How many zeros in one million?", "6", ["5", "7", "9"]),
    ("How many zeros in one billion (short scale)?", "9", ["6", "12", "8"]),
    ("A right angle measures how many degrees?", "90", ["45", "180", "360"]),
    ("A straight angle measures how many degrees?", "180", ["90", "360", "270"]),
    ("How many degrees in a full circle?", "360", ["180", "100", "365"]),
    ("How many sides does a triangle have?", "3", ["4", "5", "6"]),
    ("How many sides does a pentagon have?", "5", ["6", "4", "8"]),
    ("How many sides does a hexagon have?", "6", ["5", "7", "8"]),
    ("How many sides does an octagon have?", "8", ["6", "7", "10"]),
    ("How many legs does a spider typically have?", "8", ["6", "10", "4"]),
    ("How many legs does an insect typically have?", "6", ["8", "4", "10"]),
    ("How many strings on a standard guitar?", "6", ["4", "5", "8"]),
    ("How many keys are on a full piano?", "88", ["76", "64", "100"]),
    ("Primary colors of light are red, green, and…?", "Blue", ["Yellow", "White", "Cyan"]),
    ("Primary colors of pigment are red, blue, and…?", "Yellow", ["Green", "White", "Black"]),
    ("How many continents are commonly listed?", "7", ["5", "6", "8"]),
    ("How many oceans are commonly listed?", "5", ["4", "6", "7"]),
    ("What is the square root of 81?", "9", ["8", "7", "11"]),
    ("What is the square root of 144?", "12", ["11", "14", "16"]),
    ("What is 12 squared?", "144", ["124", "132", "156"]),
    ("Roman numeral C equals?", "100", ["50", "500", "1000"]),
    ("Roman numeral L equals?", "50", ["10", "100", "500"]),
    ("Roman numeral M equals?", "1000", ["500", "100", "50"]),
    ("Roman numeral X equals?", "10", ["5", "50", "100"]),
    ("How many bits in a byte?", "8", ["4", "16", "32"]),
    ("HTTP is a protocol for the…?", "Web", ["Email only", "FTP only", "DNS only"]),
    ("HTML is used to structure…?", "Web pages", ["Databases", "Spreadsheets", "Images"]),
    ("The currency of Japan is the…?", "Yen", ["Won", "Yuan", "Baht"]),
    ("The currency of the UK is the…?", "Pound", ["Euro", "Dollar", "Franc"]),
    ("The currency of the EU (most members) is the…?", "Euro", ["Pound", "Franc", "Mark"]),
    ("How many US cents in a nickel?", "5", ["10", "1", "25"]),
    ("How many US cents in a dime?", "10", ["5", "25", "1"]),
    ("How many US cents in a quarter?", "25", ["10", "50", "5"]),
    ("A baker's dozen is how many?", "13", ["12", "11", "14"]),
    ("How many fluid ounces in a US cup?", "8", ["10", "12", "16"]),
    ("How many pints in a quart?", "2", ["4", "3", "8"]),
    ("How many quarts in a gallon?", "4", ["2", "8", "3"]),
    ("How many inches in a foot?", "12", ["10", "16", "8"]),
    ("How many feet in a yard?", "3", ["2", "4", "6"]),
    ("How many feet in a mile?", "5280", ["5000", "1760", "1000"]),
    ("How many ounces in a pound?", "16", ["12", "10", "14"]),
    ("Water's chemical formula is…?", "H2O", ["CO2", "O2", "NaCl"]),
    ("Table salt is mostly…?", "Sodium chloride", ["Sugar", "Baking soda", "Potassium"]),
    ("The largest mammal is the…?", "Blue whale", ["Elephant", "Giraffe", "Hippo"]),
    ("The fastest land animal is the…?", "Cheetah", ["Lion", "Horse", "Greyhound"]),
    ("A group of lions is called a…?", "Pride", ["Pack", "Herd", "Flock"]),
    ("A group of crows is often called a…?", "Murder", ["Flock", "School", "Pack"]),
    ("Penguins are native to which region primarily?", "Southern Hemisphere", ["Arctic only", "Equator", "Alaska only"]),
    ("Koalas are native to…?", "Australia", ["New Zealand", "South Africa", "Brazil"]),
    ("Kangaroos are native to…?", "Australia", ["Africa", "India", "South America"]),
    ("The kiwi bird is a symbol of…?", "New Zealand", ["Australia", "Fiji", "Samoa"]),
    ("Which instrument has 88 keys?", "Piano", ["Organ", "Harpsichord", "Accordion"]),
    ("A clarinet is a…?", "Woodwind", ["Brass", "String", "Percussion"]),
    ("A trumpet is a…?", "Brass", ["Woodwind", "String", "Percussion"]),
    ("A violin is a…?", "String", ["Brass", "Woodwind", "Percussion"]),
    ("How many strings on a standard violin?", "4", ["5", "6", "8"]),
    ("Beethoven composed in which era primarily?", "Classical/Romantic", ["Baroque", "Renaissance", "Modern pop"]),
    ("Mozart's first name was…?", "Wolfgang", ["Ludwig", "Johann", "Franz"]),
    ("The Beatles were from which city?", "Liverpool", ["London", "Manchester", "Birmingham"]),
    ("Elvis Presley is associated with which city?", "Memphis", ["Nashville only", "New York", "Chicago"]),
    ("Hollywood is a district of…?", "Los Angeles", ["New York", "Las Vegas", "Miami"]),
    ("The Oscars honor work in…?", "Film", ["Music only", "Theater only", "TV news only"]),
    ("A haiku traditionally has how many syllables?", "17", ["14", "10", "21"]),
    ("A sonnet traditionally has how many lines?", "14", ["12", "16", "10"]),
    ("Pi is approximately…?", "3.14", ["2.17", "1.62", "4.13"]),
    ("The first prime number is…?", "2", ["1", "3", "0"]),
    ("An even prime number is…?", "2", ["3", "5", "1"]),
    ("How many degrees in a right triangle's angles total?", "180", ["90", "360", "270"]),
    ("A cube has how many faces?", "6", ["4", "8", "12"]),
    ("A cube has how many edges?", "12", ["6", "8", "16"]),
    ("A cube has how many vertices?", "8", ["6", "12", "4"]),
    ("A triangle's interior angles sum to…?", "180 degrees", ["90 degrees", "360 degrees", "270 degrees"]),
    ("The metric prefix kilo- means…?", "1000", ["100", "10", "0.001"]),
    ("The metric prefix milli- means…?", "0.001", ["1000", "0.01", "100"]),
    ("The metric prefix centi- means…?", "0.01", ["100", "0.001", "10"]),
    ("How many meters in a kilometer?", "1000", ["100", "10", "10000"]),
    ("How many centimeters in a meter?", "100", ["10", "1000", "12"]),
    ("Absolute zero is 0 on which scale?", "Kelvin", ["Celsius", "Fahrenheit", "Rankine only"]),
    ("Room temperature is about 20 on which scale?", "Celsius", ["Fahrenheit", "Kelvin", "Newton"]),
    ("Water freezes at 32 degrees on which scale?", "Fahrenheit", ["Celsius", "Kelvin", "Reaumur"]),
    ("How many teeth does an adult human typically have?", "32", ["28", "24", "36"]),
    ("The funny bone is actually a…?", "Nerve", ["Bone", "Muscle", "Tendon"]),
    ("The smallest bone in the human body is in the…?", "Ear", ["Finger", "Nose", "Toe"]),
    ("How many lungs does a healthy human have?", "2", ["1", "3", "4"]),
    ("The iris of the eye controls the…?", "Pupil size", ["Lens color", "Eyelid", "Retina thickness"]),
    ("Bees produce…?", "Honey", ["Silk", "Wax only", "Milk"]),
    ("Silk is produced by…?", "Silkworms", ["Spiders only", "Bees", "Ants"]),
    ("A tadpole grows into a…?", "Frog", ["Fish", "Newt only", "Snake"]),
    ("Caterpillars typically become…?", "Butterflies or moths", ["Beetles", "Flies", "Dragonflies"]),
    ("Photosynthesis happens mainly in which plant part?", "Leaves", ["Roots", "Flowers", "Seeds"]),
    ("The study of weather is…?", "Meteorology", ["Geology", "Astronomy", "Ecology"]),
    ("The study of stars is…?", "Astronomy", ["Astrology", "Geology", "Biology"]),
    ("The study of living things is…?", "Biology", ["Chemistry", "Physics", "Geology"]),
    ("The study of rocks is…?", "Geology", ["Biology", "Ecology", "Meteorology"]),
    ("NaCl is commonly known as…?", "Salt", ["Sugar", "Baking soda", "Vinegar"]),
    ("CO2 is…?", "Carbon dioxide", ["Carbon monoxide", "Oxygen", "Ozone"]),
    ("O3 is…?", "Ozone", ["Oxygen", "Water", "Methane"]),
    ("CH4 is…?", "Methane", ["Propane", "Butane", "Ethane"]),
]

WORDS = [
    "APPLE", "HOUSE", "EARTH", "WATER", "LIGHT", "MUSIC", "RIVER", "STONE", "BREAD",
    "CHAIR", "TABLE", "GREEN", "BLACK", "WHITE", "NIGHT", "HEART", "SMILE", "CLOUD",
    "STORM", "OCEAN", "PLANT", "TIGER", "HORSE", "SHEEP", "MOUSE", "EAGLE", "SNAKE",
    "FRUIT", "GRAPE", "LEMON", "MANGO", "PEACH", "BERRY", "SUGAR", "HONEY", "SPICE",
    "PIZZA", "PASTA", "SALAD", "STEAK", "BACON", "TOAST", "CREAM", "JUICE", "COFFEE",
    "TEA", "WINE", "BEER", "MILK", "SOUP", "RICE", "BEANS", "CORN", "WHEAT",
    "TRAIN", "PLANE", "SHIP", "TRUCK", "BIKE", "ROAD", "BRIDGE", "TOWER", "CASTLE",
    "PALACE", "TEMPLE", "CHURCH", "SCHOOL", "LIBRARY", "MUSEUM", "MARKET", "GARDEN",
    "FOREST", "DESERT", "ISLAND", "VALLEY", "MOUNTAIN", "CANYON", "GLACIER", "VOLCANO",
    "PLANET", "COMET", "GALAXY", "ORBIT", "ROCKET", "SATELLITE", "ENGINE", "MOTOR",
    "WHEEL", "BRAKE", "PEDAL", "RADIO", "PHONE", "CAMERA", "SCREEN", "PRINTER",
    "PENCIL", "PAPER", "BOOK", "NOVEL", "POEM", "STORY", "DRAMA", "MUSIC", "DANCE",
    "PAINT", "BRUSH", "COLOR", "SHAPE", "CIRCLE", "SQUARE", "ANGLE", "NUMBER",
    "DIGIT", "FRACTION", "PERCENT", "GRAPH", "CHART", "MAP", "NORTH", "SOUTH",
    "EAST", "WEST", "CLOCK", "WATCH", "HOUR", "MINUTE", "SECOND", "WEEK", "MONTH",
    "YEAR", "SPRING", "SUMMER", "WINTER", "AUTUMN", "SEASON", "WEATHER", "THUNDER",
    "LIGHTNING", "RAINBOW", "SUNSET", "SUNRISE", "SHADOW", "MIRROR", "GLASS", "METAL",
    "WOOD", "STONE", "BRICK", "CEMENT", "COPPER", "SILVER", "GOLD", "IRON", "STEEL",
    "COTTON", "WOOL", "SILK", "LEATHER", "RUBBER", "PLASTIC", "PAPER", "CARDBOARD",
    "FAMILY", "FRIEND", "NEIGHBOR", "TEACHER", "DOCTOR", "NURSE", "PILOT", "DRIVER",
    "FARMER", "BAKER", "CHEF", "JUDGE", "LAWYER", "ARTIST", "SINGER", "ACTOR",
    "PLAYER", "COACH", "TEAM", "SCORE", "GOAL", "MATCH", "GAME", "PRIZE", "MEDAL",
    "CROWN", "SWORD", "SHIELD", "ARMOR", "ARROW", "BOW", "LANCE", "HELMET",
    "QUEEN", "KING", "PRINCE", "KNIGHT", "WIZARD", "DRAGON", "GIANT", "FAIRY",
    "MAGIC", "SPELL", "POTION", "QUEST", "HERO", "VILLAIN", "STORY", "MYTH",
    "LEGEND", "FABLE", "RIDDLE", "PUZZLE", "SECRET", "CLUE", "HINT", "ANSWER",
    "QUESTION", "TRIVIA", "JUMBLE", "LETTER", "WORD", "SENTENCE", "PARAGRAPH",
    "CHAPTER", "TITLE", "AUTHOR", "READER", "LIBRARY", "SHELF", "INDEX", "GLOSSARY",
]


def unique_add(bank, item, seen):
    key = item["q"].strip().lower()
    if key in seen:
        return
    if len(item["choices"]) != 4:
        return
    if not (0 <= item["answerIndex"] < 4):
        return
    seen.add(key)
    bank.append(item)


def build():
    bank = []
    seen = set()

    # keep originals first
    original = json.loads((ROOT / "games" / "quiznight.json").read_text(encoding="utf-8"))
    for item in original.get("questions", []):
        unique_add(bank, item, seen)

    for country, cap, wrong in CAPITALS:
        unique_add(bank, q("What is the capital of %s?" % country, [cap] + wrong, cap), seen)
        unique_add(bank, q("%s is the capital of which country?" % cap, [country] + [c for c, _, _ in rng.sample(CAPITALS, 3) if c != country][:3], country), seen)

    for state, cap, wrong in US_CAPS:
        unique_add(bank, q("What is the capital of %s?" % state, [cap] + wrong, cap), seen)
        unique_add(bank, q("%s is the capital of which US state?" % cap, [state] + [s for s, _, _ in rng.sample(US_CAPS, 4) if s != state][:3], state), seen)

    names = [n for _, n in ELEMENTS]
    for sym, name in ELEMENTS:
        others = [n for n in names if n != name]
        unique_add(bank, q("What element has the symbol %s?" % sym, [name] + rng.sample(others, 3), name), seen)
        unique_add(bank, q("What is the chemical symbol for %s?" % name, [sym] + [s for s, n in rng.sample(ELEMENTS, 4) if n != name][:3], sym), seen)

    for i, p in enumerate(PLANETS):
        others = [x for x in PLANETS if x != p]
        unique_add(bank, q("Which planet is %s from the Sun?" % ["closest", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"][i], [p] + rng.sample(others, 3), p), seen)
        unique_add(bank, q("%s is which planet from the Sun?" % p, [str(i + 1)] + [str(x) for x in rng.sample([1, 2, 3, 4, 5, 6, 7, 8], 3) if x != i + 1][:3], str(i + 1)), seen)

    for title, author, wrong in AUTHORS:
        unique_add(bank, q("Who wrote \"%s\"?" % title, [author] + wrong, author), seen)

    for thing, who, wrong in INVENTIONS:
        unique_add(bank, q("Who is credited with the %s?" % thing, [who] + wrong, who), seen)

    for prompt, ans, wrong in SPORTS + SCIENCE + GEO + HISTORY + MISC:
        unique_add(bank, q(prompt, [ans] + wrong, ans), seen)

    # math
    for a in range(1, 31):
        for b in range(1, 31):
            s = a + b
            unique_add(bank, q("What is %d + %d?" % (a, b), [str(s), str(s + 1), str(s - 1), str(s + 2)], str(s)), seen)
            p = a * b
            if 2 <= a <= 12 and 2 <= b <= 12:
                unique_add(bank, q("What is %d × %d?" % (a, b), [str(p), str(p + a), str(p - b if p > b else p + 3), str(p + 1)], str(p)), seen)
            if a > b:
                unique_add(bank, q("What is %d − %d?" % (a, b), [str(a - b), str(a + b), str(abs(a - b - 1)), str(a - b + 2)], str(a - b)), seen)
            if b and a % b == 0 and a != b and a // b <= 12:
                unique_add(bank, q("What is %d ÷ %d?" % (a, b), [str(a // b), str(a // b + 1), str(max(1, a // b - 1)), str(a - b)], str(a // b)), seen)

    for n in range(2, 31):
        unique_add(bank, q("What is %d squared?" % n, [str(n * n), str(n * n + n), str(n * n - 1), str((n + 1) * (n + 1))], str(n * n)), seen)
        unique_add(bank, q("What is %d cubed?" % n, [str(n ** 3), str(n ** 2), str(n ** 3 + n), str((n + 1) ** 3)], str(n ** 3)), seen) if n <= 12 else None

    months = [
        ("January", 31), ("February", 28), ("March", 31), ("April", 30),
        ("May", 31), ("June", 30), ("July", 31), ("August", 31),
        ("September", 30), ("October", 31), ("November", 30), ("December", 31),
    ]
    for name, days in months:
        unique_add(bank, q("How many days does %s have in a common year?" % name, [str(days), "30" if days == 31 else "31", "28" if days != 28 else "29", "29"], str(days)), seen)

    ordinal = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"]
    for i, (name, _) in enumerate(months):
        unique_add(bank, q("Which month is the %s of the year?" % ordinal[i], [name] + [m for m, _ in rng.sample(months, 3) if m != name][:3], name), seen)

    for n in [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144]:
        r = int(n ** 0.5)
        unique_add(bank, q("What is the square root of %d?" % n, [str(r), str(r + 1), str(r - 1 if r > 1 else r + 2), str(r + 2)], str(r)), seen)

    # years / numbers
    for y in range(1900, 2025, 5):
        unique_add(bank, q("How many years after 1900 is %d?" % y, [str(y - 1900), str(y - 1899), str(y - 1901), str(2000 - (y - 1900))], str(y - 1900)), seen)

    extra_words = [
        "ORANGE", "BANANA", "CHERRY", "PURPLE", "SILVER", "ORANGE", "VIOLET", "INDIGO",
        "WINDOW", "DOORWAY", "KITCHEN", "GARDEN", "FLOWER", "PETAL", "STEM", "ROOT",
        "BRANCH", "LEAVES", "FOREST", "JUNGLE", "PRAIRIE", "MEADOW", "STREAM", "BROOK",
        "LAGOON", "HARBOR", "ANCHOR", "SAILOR", "CAPTAIN", "PIRATE", "ISLAND", "LAGOON",
        "CASTLE", "DRAGON", "KNIGHT", "SWORD", "SHIELD", "HELMET", "ARMOR", "CROWN",
        "PLANET", "COMET", "METEOR", "ROCKET", "ORBIT", "CRATER", "NEBULA", "QUASAR",
        "GUITAR", "VIOLIN", "FLUTE", "DRUMS", "PIANO", "BANJO", "CELLO", "HARP",
        "SOCCER", "TENNIS", "HOCKEY", "BOXING", "SKIING", "SURFING", "ROWING", "RACING",
        "PYTHON", "RUBY", "JAVA", "LINUX", "PIXEL", "BYTE", "CHIP", "DISK",
        "COOKIE", "MUFFIN", "BAGEL", "DONUT", "WAFFLE", "PANCAKE", "BUTTER", "CHEESE",
        "PEPPER", "ONION", "GARLIC", "GINGER", "BASIL", "THYME", "SAGE", "MINT",
        "JACKET", "GLOVES", "SCARF", "BOOTS", "HAT", "COAT", "SHIRT", "PANTS",
        "TIGER", "LION", "BEAR", "WOLF", "FOX", "DEER", "MOOSE", "OTTER",
        "EAGLE", "HAWK", "OWL", "SWAN", "DUCK", "GOOSE", "CRANE", "HERON",
        "SHARK", "WHALE", "SEAL", "CRAB", "CLAM", "SQUID", "CORAL", "REEF",
    ]
    long_words = [w for w in (WORDS + extra_words) if 4 <= len(w) <= 10]
    long_words = list(dict.fromkeys(long_words))
    for w in long_words:
        others = [x for x in long_words if x != w and abs(len(x) - len(w)) <= 2]
        if len(others) < 3:
            continue
        for _ in range(3):
            distract = rng.sample(others, 3)
            unique_add(bank, q("Unscramble: %s" % scramble(w), [w] + distract, w, "jumble"), seen)

    rng.shuffle(bank)
    # keep a stable mix: don't drop below 2000
    return bank


def main():
    bank = build()
    original = json.loads(OUT.read_text(encoding="utf-8"))
    original["questions"] = bank
    original["tagline"] = "Trivia and jumbles. Thousands in the bank."
    original["blurb"] = (
        "Four big answers a question. Trivia is +10, a jumble is +15. "
        "Twelve drawn from a bank of %d, then take score." % len(bank)
    )
    OUT.write_text(json.dumps(original, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    trivia = sum(1 for x in bank if x["kind"] == "trivia")
    jumble = sum(1 for x in bank if x["kind"] == "jumble")
    print("wrote %s questions=%d trivia=%d jumble=%d" % (OUT, len(bank), trivia, jumble))


if __name__ == "__main__":
    main()
