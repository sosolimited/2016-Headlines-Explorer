var search = (function(){
	var interesting_blacklist = ['&','+','—'];
	var api_url = 'https://2016headlines.sosolimited.com/api/headlines?';

	var headlines_ref = null;
	var results_ref = null;

	function _setLocationHash(){
		location.hash = '#query=' + encodeURIComponent($("#search").val());
		if( active_liwc ){
			location.hash += '&liwc=' + encodeURIComponent(active_liwc);
		}
	}

	// does the sub array 'subarr' occur in 'arr' (with exact ordering)?
	function _find_sub(subarr, arr, from_index) {
	  var i = from_index >>> 0,
	      sl = subarr.length,
	      l = arr.length + 1 - sl;

	  loop: for (; i<l; i++) {
	      for (var j=0; j<sl; j++)
	          if (arr[i+j] !== subarr[j])
	              continue loop;
	      return i;
	  }
	  return -1;
	}

	// do any words in [arr] appear in [terms]?
	function _contains_any(arr, terms){
		for( var i=0; i<terms.length; i++){
			if( arr.indexOf(terms[i]) > -1 ){
				return true;
			}
		}

		return false;
	}

	// do any words in [arr] appear in [terms]?
	// support for wildcard with auto detection (slower)
	function _contains_any_auto_wc(arr, terms){
		for( var i=0; i<terms.length; i++){
			// step through each search term
			for( var j=0; j<arr.length; j++ ){
				var st = arr[j];

				if( st.charAt(st.length-1) == '*' ){
					if( terms[i].indexOf( st.substr(0, st.length-1) ) == 0 ){
						return true;
					}
				}
				else if(terms[i] == st) {
					return true;
				}
			}
		}
		return false;
	}

	// do any words in [arr] appear in [terms]?
	// support for wildcard only
	function _contains_any_wc(arr, terms){
		for( var i=0; i<terms.length; i++){
			// step through each search term
			for( var j=0; j<arr.length; j++ ){
				// check for wildcard
				if( terms[i].indexOf(arr[j]) == 0 ){
					return true;
				}
			}
		}
		return false;
	}


	// return OR array. each item is an array with 
	// 1+ terms (more than 1 = AND them)
	function _parseSearch(raw_input){
		raw_input = raw_input.replace(/\s\s+/g, ' ');

		// first split by comma
		var terms = raw_input.split(',').filter(function(t){
			return t.length;
		}).map(function(term){
			term = term.trim().toLowerCase();;

			return term.split(' ');
		});

		var res = { OR: [], OR_WC: [], AND: [] };

		terms.forEach(function(t){
			if(t.length == 1){
				var tm = t[0];
				if( tm.charAt(tm.length-1) == '*'){
					res.OR_WC.push( tm.substr(0, tm.length-1) );
				}
				else {
					res.OR.push(tm);
				}
				
			}
			else {
				res.AND.push(t);
			}
		});

		return res;
	}

	// return top n terms from currently hover'd week/source combo
	function _getInterestingTerms(week_idx, src, n){
		var interesting = {};

		// for every word in every headline
		results_ref.results[week_idx][src].articles.forEach(function(article){
			if( article == null ){
				return;
			}
			// for every token
			article.tokens.forEach(function(token){
				var _tok = token.replace("’","'");

				// if already in term list, increment
				if( interesting.hasOwnProperty(_tok) ){
					interesting[_tok]++;
					return;
				}

				// make sure it's not a liwc function word
				for( var i=0; typeof liwc_categories !== 'undefined' && i<liwc_categories.func.words.length; i++){
					var func = liwc_categories.func.words[i];

					// liwc func wildcard match
					if( func.charAt( func.length - 1 ) == '*' ){
						if( _tok.indexOf( func.substr(0, func.length-1) ) == 0 ){
							return;
						}
					}
					// liwc func full word match
					else if( _tok == func ){
						return;
					}
				}

				// not function word match, so add to list
				interesting[_tok] = 1;
			});
		});

		// remove references to search terms
		results_ref.terms_flat.forEach(function(t){
			delete interesting[t];
		});

		var terms = [];

		Object.keys(interesting).forEach(function(k){
			terms.push( [k, interesting[k]] );
		})

		terms.sort(function(a,b){
			return a[1] - b[1];
		}).reverse();

		return terms.filter(function(t){
			return interesting_blacklist.indexOf(t[0]) == -1
		}).slice(0,n);
	}

	// return list with # of results from each publication, by week, along with headlines
	function _find_terms(terms){
		var res = [];

		headlines_ref.forEach(function(week,widx){
			var set = {};
			set.weekstr = week.weekstr;

			selected_sources.forEach(function(src){
				set[src] = {
					articles: [],
					'%': 0,
					'#': 0
				};
			});

			res.push( set );

			// for each source
			selected_sources.forEach(function(src){
				// loop over each article from this week in source
				week[src].forEach(function(article){
					var match = false;

					// check for OR matches on single terms
					if( terms.OR.length ){
						match = _contains_any( terms.OR, article.tokens );
					}

					if( !match && terms.OR_WC.length ){
						match = _contains_any_wc( terms.OR_WC, article.tokens );
					}

					// if no OR match for single terms, check the AND terms
					if( !match && terms.AND.length ){
						for(var i=0; i<terms.AND.length; i++){
							match = _find_sub(terms.AND[i], article.tokens, 0) > -1;
							if( match ) break;
						}
					}

					// no AND/OR search terms found; exit article
					if( !match ){
						return;
					}

					// further filter by liwc matching, if set
					if( active_liwc != '' ){
						if( !_contains_any_auto_wc( liwc_categories[active_liwc].words, article.tokens ) ){
							return;
						}
					}

					set[src]['#']++;
					set[src].articles.push(article);
				});

				set[src]['%'] = (set[src].articles.length / headlines_ref[widx][src].length) * 100
			});
		});

		return res;
	}

	// return flat list of search terms; useful for highlighting
	function _getFlatTerms(terms){
		var res = [];

		res = res.concat( terms.OR );

		res = res.concat( terms.OR_WC.map(function(t){
			return t + '*';
		}));

		// flatten ands
		var ands = [].concat.apply([],terms.AND);

		res = res.concat(ands);

		return res;
	}

	// for blank searching
	function _getAllResults(){
		var res = [];

		headlines_ref.forEach(function(week){
			var set = {};
			set.weekstr = week.weekstr;
				
			selected_sources.forEach(function(src){
				set[src] = {
					articles: [],
					'%': 0,
					'#': 0
				};

				week[src].forEach(function(article){
					// if LIWC enabled, check for vocab
					if( active_liwc != '' ){
						if( !_contains_any_auto_wc(liwc_categories[active_liwc].words, article.tokens) ){
							return;
						}
					}

					set[src]['#']++;
					set[src].articles.push(article);
				});

				
				set[src]['%'] = (set[src]['#'] / week[src].length) * 100;
			});

			res.push(set);
		});

		return res;
	}

	// add interesting terms, generate graph, generate CSVs
	function _processResults(){
		// pre-gen interesting terms
		var tot_res = 0;
		results_ref.results.forEach(function(week, idx){
			selected_sources.forEach(function(source){
				week[source]['interesting'] = _getInterestingTerms(idx, source, 20);
				tot_res += week[source]['articles'].length;
			});
		});

		if( tot_res == 0 ){
			$("#no-results").show();
		}
		else {
			$("#no-results").hide();
		}

		$("#interesting-terms,#words").html('');

		graph.build(results_ref);
		csv.generateAll(results_ref);

		$("#csv-term").html( $("#search").val().trim() );
	}

	// return raw results only
	function getResults(query){
		var result_set = {};
		result_set.terms = _parseSearch(query);
		result_set.terms_flat = _getFlatTerms(result_set.terms);

		// support empty search box (very slow)
		if( result_set.terms_flat.length == 0 ){
			result_set.results = _getAllResults();
		}
		else {
			result_set.results = _find_terms(result_set.terms);
		}

		return result_set;
	}

	// searches and kicks off graph regeneration, csv's, & interesting terms (frontend stuff)
	function search(query){
		$("#results-title").css('visibility', 'hidden');

		// search through API
		if( use_api ){
			var req_url = api_url + 'query=' + encodeURIComponent(query) 
				+ '&sources=' + selected_sources.join(',')
				+ '&liwc=' + active_liwc;

			$.getJSON(req_url).done(function(data){
				results_ref = data;
				_processResults();
			}).fail(function(err){
				console.error('api error status', err.status);
				console.error(err.responseJSON);
			});
		}
		// search locally
		else {
			results_ref = getResults(query);
			_processResults();
		}

		_setLocationHash();
	}

	return {
		search: search,
		setHeadlines: function(hl){
			headlines_ref = hl;
		},
		getResults: getResults,
		getLastResultSet: function(){
			return results_ref;
		}
	}
})();

if( typeof module !== 'undefined' ){
	module.exports = search;
}