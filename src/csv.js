var csv = (function(){
	var results_ref = null;

	function _generateNumeric(type){
		var lines = [];
		var weeks = [''].concat(results_ref.results.map(function(w){
			return w.weekstr;
		}));

		lines.push(weeks);

		var src_lines = {};

		results_ref.results.map(function(wk, index){
			selected_sources.forEach(function(src){
				if(!src_lines.hasOwnProperty(src)){
					src_lines[src] = [src.toUpperCase()];
				}

				if( type == '#' ){
					src_lines[src].push( wk[src]['#'] );
				}
				else {
					src_lines[src].push( wk[src]['%'].toFixed(3) );
				}
			});
		});

		Object.keys(src_lines).forEach(function(k){
			lines.push( src_lines[k] );
		});

		return 'data:text/csv;charset=utf-8,' + Papa.unparse(lines,{newline:'%0A'});
	}

	function _generateInterestingTerms(){
		var lines = [];
		var weeks = []

		results_ref.results.map(function(w){
			selected_sources.forEach(function(src){
				weeks.push(w.weekstr + ' (' + src.toUpperCase() + ')');
			});
		});

		lines.push(weeks);

		var terms = [];
		var longest = 0;

		results_ref.results.map(function(wk, index){
			selected_sources.forEach(function(src){
				var cur_list = wk[src].interesting.map(function(i){ return i[0]; });

				if( cur_list.length > longest ){
					longest = cur_list.length;
				}

				terms.push( cur_list );
			});
		});

		// traverse along rows
		for( var i=0; i<longest; i++ ){
			var row = [];

			terms.forEach(function(column){
				if( column.hasOwnProperty(i) ){
					row.push(column[i]);
				}
				else {
					row.push('');
				}
			});

			lines.push(row);
		}

		return 'data:text/csv;charset=utf-8,' + Papa.unparse(lines,{newline:'%0A'});
	}

	function _generateHeadlines(){
		// skip this if the search terms are blank (too much data to insert into <a> href
		if( results_ref.terms_flat.length == 0 ){
			$(".csvtxt").hide();
		}
		else {
			$(".csvtxt").show();
		}

		var lines = [['Source','Headline','Week','ISO Date String', 'URL']];

		results_ref.results.map(function(wk){
			selected_sources.forEach(function(src){
				wk[src].articles.map(function(a){
					if( a == null ) return;
					lines.push( [src, a.headline, wk.weekstr, a.date, a.article_url] );
				});
			});
		});

		return 'data:text/csv;charset=utf-8,' + Papa.unparse(lines,{newline:'%0A'});
	}

	function generateAll(result_set){
		results_ref = result_set;

		// generate CSVs
		$("#save-csv a.csvfreq").attr('href', _generateNumeric('#'));
		$("#save-csv a.csvperc").attr('href', _generateNumeric('%'));
		$("#save-csv a.csvtxt").attr('href', _generateHeadlines());
		$("#save-csv a.csvterms").attr('href', _generateInterestingTerms());
	}

	return {
		generateAll: generateAll
	}

})();
