# Headline Tokenization

To increase search performance, each headline is pre-processed to generate a list
of word tokens. The resulting tokens list is included alongside other metadata like 
article date and URL. For example, a list of tokens for the headline 
`After ‘Brexit’ Vote, Europe’s Leaders Debate Timing of U.K.’s Departure` would be: 

```json
[
  "after", 
  "brexit", 
  "vote", 
  "europe", 
  "leaders",  
  "debate", 
  "timing", 
  "of", 
  "u.k.",  
  "departure"
]
```

Punctuation and possessives are removed, and everything is lowercased. 
An example javascript function for generating this list is shown below. 
It is sufficient for headline-style language, but would need 
tweaks to handle, for example, general prose.

```js

function tokenizeHeadline(text){
  // first, split the headline by whitespace
  var tokens = text.split(/\s+/).map(function(word){
    // additionally, split each of the fragments by em dash
    return word == '—' ? ['—'] : word.split(/—/);
  });

  // flatten to one dimensional list
  tokens = [].concat.apply([], tokens);

  // find and remove various unwanted characters from each fragment
  tokens = tokens.map(function(word){
    return word
      .replace(/[‘"“”:;()!|]/g,'') // most punctuation
      .replace(/[\'’]s/g,'') // possessives ('s)
      .replace(/[’\'?]+$/g, '') // additional possessives (' at end of word)
      .replace(/[,]$/g, '') // comma at end of word
      .toLowerCase(); // transform to all lowercase letters
  });
  
  // filter list to remove blank tokens
  tokens = tokens.filter(function(word){
    return word != "";
  });

  return tokens;
}

var headline = "After ‘Brexit’ Vote, Europe’s Leaders Debate Timing of U.K.’s Departure";

var tokens = tokenizeHeadline(headline);

```

The example function makes use of [Regular Expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions), 
which is a language for finding patterns in text. Regex is built into Javascript. 
