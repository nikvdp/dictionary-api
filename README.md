# OS X Dictionary API
<!-- ah ha.... -->

<!-- testing 1 2 3 4-->

### Installation and Setup

Clone the repository and run npm install:

```
git clone https://github.com/nikvdp/dictionary-api.git
npm install
```

The next step is to import the OS X dictionaries you'd like to use with the tool. You can see the dictionaries available on your system in `/Library/Dictionaries`. 

On my machine that gives me the following list:

```
$ ls /Library/Dictionaries
Apple Dictionary.dictionary
Diccionario General de la Lengua Española Vox.dictionary
Duden Dictionary Data Set I.dictionary
Dutch.dictionary
French - English.dictionary
German - English.dictionary
Hindi.dictionary
Italian.dictionary
Korean - English.dictionary
Korean.dictionary
Multidictionnaire de la langue française.dictionary
New Oxford American Dictionary.dictionary
Norwegian.dictionary
Oxford American Writer's Thesaurus.dictionary
Oxford Dictionary of English.dictionary
Oxford Thesaurus of English.dictionary
Portuguese.dictionary
Russian.dictionary
Sanseido Super Daijirin.dictionary
Sanseido The WISDOM English-Japanese Japanese-English Dictionary.dictionary
Simplified Chinese - English.dictionary
Spanish - English.dictionary
Swedish.dictionary
Thai.dictionary
The Standard Dictionary of Contemporary Chinese.dictionary
Turkish.dictionary
```

I'm going to use this with one dictionary and one thesaurus, the `Oxford Dictionary of English` and `Oxford American Writer's Thesaurus` respectively. To import run:

```
./convertDicts.js "/Library/Dictionaries/Oxford Dictionary of English.dictionary"
./convertDicts.js "/Library/Dictionaries/Oxford American Writer's Thesaurus.dictionary"
```

This will take some time, when it complets you should see a message like: 

```
Wrote xml file to [/Users/nik/Dropbox/volley-challenge/dictionaries/work/api/dicts/Oxford Dictionary of English.xml]!
Wrote json file to [Users/nik/Dropbox/volley-challenge/dictionaries/work/api/dicts/Oxford Dictionary of English.json]!
```

Repeat this process for as many dictionaries as you'd like to use. 


## Starting the server
To run the api, just run 


```
./api.js
```

You'll see output like the following while it loads each of the dictionaries:
```
Loading dictionary [Oxford Dictionary of English]...  DONE!
Loading dictionary [Oxford American Writer's Thesaurus]...  DONE!
dictionary-api listening on port 5000
```


## API documentation

Requests to the api take the form of `/dictionaries/<dictionary_name>/<word>` for definition lookups. 
For thesaurus lookups they are similar, except that `dictionaries` is replaced with `thesauri`, e.g. `/thesauri/<thesauri_name>/<word>`

The only thing to keep in mind is that **dictionary and thesauri names must be URL encoded.**

For example, to get the definition of the word "volley" via `curl`, you could use the following: 
```
curl 'localhost:5000/dictionaries/New%20Oxford%20American%20Dictionary/volley'
```

And to look up synonyms for the word volley you could do the following:
```
curl "localhost:5000/dictionaries/Oxford%20American%20Writer's%20Thesaurus/volley"
```

