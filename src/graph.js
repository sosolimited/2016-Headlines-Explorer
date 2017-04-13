var graph = (function(){
	if (!String.prototype.splice) {
		String.prototype.splice = function(start, delCount, newSubStr) {
			return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
		};
	}

	// store last results, used across internal functions
	var results_ref = null;

	function _getXLabels(week_strings){
		var last_month = '';

		return week_strings.map(function(item){
			// get start of week to Sunday
			var month_m = moment( item ).subtract(1,'day');
			var cur_m = month_m.format("MMM");
			var cur_d = month_m.format("D");

			var _m = last_month == cur_m ? cur_d : [cur_m,cur_d].join(' ');
			last_month = cur_m;
			return _m;
		});
	}

	// split by spaces, then by em dash
	function _simpleTokenize(str){
		var pre_list = str.split(/\s+/).map(function(item){
			return item == '—' ? ['—'] : item.split(/—/);
		});

		return [].concat.apply([], pre_list);
	}

	function _highlightTerms(article, terms, contains_liwc){
		var final_text = article.headline;
		var raw_tokens = _simpleTokenize(article.headline);

		terms.forEach(function(term, tidx){
			var raw_idx;

			// check for wildcard term
			var is_wc = term.charAt(term.length-1) == '*';

			if( is_wc ){
				var wc_term = term.substr(0,term.length-1);

				for( var i=0; i<article.tokens.length; i++ ){
					if( article.tokens[i].indexOf(wc_term) == 0 ){
						raw_idx = i;
						break;
					}
				}
			}
			else {
				raw_idx	= article.tokens.indexOf(term);
			}

			var liwc_class = contains_liwc && tidx >= results_ref.terms_flat.length ? 'liwc' : '';

			var to_insert = '<span class="kw '+liwc_class+'">' + raw_tokens[raw_idx] + '</span>';

			var cur = 0;
			var start = final_text.indexOf(raw_tokens[raw_idx], cur);

			while( start > -1 ){
				final_text = final_text.splice(start, raw_tokens[raw_idx].length, to_insert);

				cur = start + to_insert.length;
				start = final_text.indexOf(raw_tokens[raw_idx], cur);
			}
		});

		return final_text;
	}

	function _addHeadlines(data, source){
		$("#words").html('');
		$("#interesting-terms").html('<ol></ol>');

		var last_day = '';

		data.articles.forEach(function(article){
			if( article == null ) return;
			var day = moment(article.date).format("ddd MMM D");
			if( day != last_day ){
				$("#words").append('<strong class="day">'+day+'</strong><br />');
			}

			last_day = day;
			var a = $('<a>');
			a.attr('href', article.article_url).attr('target','_blank');

			if( active_liwc != '' ){
				a.html( _highlightTerms( article, results_ref.terms_flat.concat(liwc_categories[active_liwc].words), true ) );
			}
			else {
				a.html( _highlightTerms( article, results_ref.terms_flat, false ) );
			}

			$("#words").append(a);
			$("#words").append('<br />');
		});

		// set proper highlight color
		$(".liwc,.kw").css('background-color', source_settings[source].color);

		var att = $('<div class="attribution">');

		if( source == 'nyt' ){
			att.append('<a href="http://developer.nytimes.com">Data provided by The New York Times</a><br />Copyright (c) 2013 The New York Times Company. All Rights Reserved.');
		}
		else {
			att.append('Data provided by The Wall Street Journal<br />Copyright (c) 2017 Dow Jones & Company, Inc. All Rights Reserved.');
		}

		//$("#words").append(att);

		var interesting = data.interesting;

		interesting.forEach(function(t){
			$("#interesting-terms ol").append('<li>' + t[0] + '</li>');
		});

		if( interesting.length == 0 ){
			$("#interesting-terms ol").append('<em>nada</em>');
		}
	}

	function _doHover(data, idx, src){
		// hide initial instructions
		$("#instructions").hide();

		_addHeadlines(data, src);

		// add headings
		var m_s = moment( results_ref.results[idx].weekstr ).subtract(1,'day');
		var m_e = moment(m_s).add(7,'days');

		var sstr = m_s.year() == m_e.year() ? m_s.format("MMM D") : m_s.format("MMM D, YYYY");

		// add stats to results div
		var perc_str = data['#'] + ' headlines from this week (' + data['%'].toFixed(1) + '%)';
		$("#words").prepend("<hr><h2>" + perc_str + "</h2>");

		// set results title
		var week_str = sstr + '–' + m_s.add(7,'days').format('MMM D, YYYY');

		$("#results-title").css('visibility', 'visible');

		$(".results-title-date").html(week_str);
		$(".results-title-source")
			.html('&nbsp//&nbsp ' + source_settings[src].name)
			.css('color', source_settings[src].color);

		// pre-insert top terms title
		$("#interesting-terms").prepend('<hr><h2>Weekly top terms</h2>');
	}

	function build(result_set){
		results_ref = result_set;

		$("svg").html('');
		var y_type = $('input[name="graph-y"]:checked').attr('data-key');

		var margins = {top: 10, right: 30, bottom: 100, left: 52};
		var svg = d3.select("svg");
		var g = svg.append('g')
			.attr('transform','translate('+margins.left+','+margins.top+')');

		var width = +svg.attr('width') - margins.left - margins.right;
		var height = +svg.attr('height') - margins.top - margins.bottom;

		// across all weeks
		var x0 = d3.scaleBand().rangeRound([0, width]).paddingInner(0.21);
		
		// within single week
		var x1 = d3.scaleBand();

		var y = d3.scaleLinear().rangeRound([height,0]);

		var _x_dom = results_ref.results.map(function(h){ return h.weekstr; });
		var _x_labels = _getXLabels(_x_dom);

		x0.domain( _x_dom );
		x1.domain( Object.keys(source_settings) )
			.rangeRound([0,x0.bandwidth()]);

		// Y domain dynamically maps to % or # depending on UI setting
		y.domain([0,d3.max(results_ref.results, function(wk){
			var check = selected_sources.map(function(src){
				return wk[src][y_type];
			});

			return d3.max(check);
		})]);

		function customYAxis(g){
			var fmt_string = y_type == '#' ? "d" : ".1f";

			var yaxis = d3.axisLeft(y)
				.tickFormat(d3.format(fmt_string)).ticks(4)
				.tickPadding(22)
				.tickSizeOuter(0)
				.tickSizeInner(-width + margins.left);

			g.call(yaxis);
			g.select('path').remove();
			g.selectAll('.tick line')
				.attr('stroke', '#C6C4C4');

			g.selectAll('text')
				.attr('font-size', '13');
		}

		// Y labels
		g.append("g")
			.attr('class','axis')
			.attr('transform', 'translate(10,0)')
			.attr('text-align', 'left')
			.call(customYAxis);

		$(".axis-label").html(y_type + " of headlines");

		// main graph
		var week_group = g.append("g")
			.selectAll("g")
			.data(results_ref.results)
			.enter().append("g")
				.attr("transform", function(d,idx){ 
					return 'translate(' + x0(_x_dom[idx]) + ',0)';
				});

		week_group.append("text")
			.attr('text-anchor', 'middle')
			.text('▲')
			.attr('x', 9)
			.attr('y', height + 52)
			.classed('no-show', true)
			.attr('font-size', 10)
			.classed('hover-arrow', true);

		week_group.selectAll('rect')
			.data(function(d,widx){
				return Object.keys(d).filter(function(item){
						return item != 'weekstr';
					})
					.map(function(item){
						return { 
							key: item, '#': d[item]['#'], 
							'%': d[item]['%'], widx: widx 
						}
					});
			})
			.enter().append('rect')
				.attr('x', function(d){ return x1(d.key) })
				.attr('y', function(d){ return y(d[y_type]); })
				.attr('width', function(d){ return x1.bandwidth() })
				.attr('height', function(d){ return height-y(d[y_type]) })
				.attr('fill', function(d){ return source_settings[d.key].color; })
				.attr('class', function(d){ 
					var c = 'bar-' + d.key;
					if( selected_sources.indexOf(d.key) == -1 ){
						c += ' bar-hide';
					}
					return c;
				})
				.on('mouseover', function(d,i){
					if( d['#'] == 0 ) return;

					// clear any existing hovers
					g.selectAll('rect').classed('bar-selected-nyt', false);
					g.selectAll('rect').classed('bar-selected-wsj', false);
					g.selectAll('.hover-arrow').classed('no-show', true);

					d3.select(this).classed('bar-selected-' + d.key, true);
					d3.select(this.parentNode).select('.hover-arrow').classed('no-show', false);

					// show headlines + other stats for this data element
					_doHover(results_ref.results[d.widx][d.key], d.widx, d.key);
				});

		function customXAxis(g){
			var xaxis = d3.axisBottom(x0).tickFormat(function(d,idx){
				return _x_labels[idx];
			});
			g.call( xaxis );
			g.select('path').remove();
			g.selectAll('.tick line').remove();
			g.selectAll('text')
				.attr('transform','translate(-14,7),rotate(-90)')
				.attr('text-anchor', 'end')
				.attr('font-size', '13');
		}

		// X labels
		g.append("g")
			.attr('class', 'axis')
			.attr('transform', 'translate(0,' + height + ')')
			.call(customXAxis);
	}

	return {
		build: build
	}
})();
