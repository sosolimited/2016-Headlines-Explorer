# 2016 Headlines Visualization
Explore every 2016 headline from the New York Times and Wall Street Journal. Search for a topic or phrase, 
compare the coverage, and download the results. Use this tool for research or for fun. Download the code 
and make your own visualization.

## Use
For a quick spin, visit [https://2016headlines.sosolimited.com](https://2016headlines.sosolimited.com). 

If you'd like to use the page locally, 
[download a zip archive](https://github.com/sosolimited/2016-Headlines-Explorer/archive/master.zip)
and open `index.html` in your browser.

## Search Features
- singular terms: `brexit`
- comma separated to match headlines with any of the listed words: `trump, clinton`
- space separated to match headlines containing all terms in a specific order: `north korea`
- wildcard asterisk to match headlines with words containing the fragment at the start: `tech*`

The search operates across simplified versions of the headlines: lower-cased, without punctuation or possessives. 
E.g. searching for `hillary clinton` would match a headline containing the fragment `Hillary Clinton's Campaign [...]`.

Note: each paper has different standards for the use of punctuation within acronyms so it's best to 
include both when searching. e.g. `EPA, E.P.A.`

## CSV exporting
The page supports exporting search results in CSV format. The various export types are linked to in the header. 
The CSVs reflect all search options, including source selection.

## headlines.json format
`data/headlines.json` contains an ordered array of 53 items. Each item is an object with a full week's worth of
headlines from both the WSJ and the NYT. The first item represents the week of Dec 27, 2015, with headlines starting 
on Jan 1, 2016. The last object holds headlines from the week of Dec 25, 2016, with headlines through Dec 31, 2016.

```
[
    {
        "wsj": [
            {
                "headline": "The Art of Biography",
                "article_url": "http://www.wsj.com/articles/the-art-of-biography-1451514816",
                "date": "2016-01-01T05:00:00.000Z",
                "tokens": ["the", "art", "of", "biography"]
            },
            ...
        ],
        "nyt": [ 
            ... 
        ],
        "weekstr": "2015W53"
    },
    ...
]
```

For details on token list generation, see [tokenization.md](tokenization.md);

## Sources

[![NYT API](img/poweredby_nytimes_200a.png)](https://developer.nytimes.com)

Data provided by the [Wall Street Journal Archive](http://www.wsj.com/public/page/archive.html).

## License

[MIT](http://www.opensource.org/licenses/MIT)
