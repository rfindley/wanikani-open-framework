// ==UserScript==
// @name        Wanikani Open Framework - ItemData module
// @namespace   rfindley
// @description ItemData module for Wanikani Open Framework
// @version     1.0.18
// @copyright   2018+, Robin Findley
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

(function(global) {

	//########################################################################
	//------------------------------
	// Published interface.
	//------------------------------
	global.wkof.ItemData = {
		presets: {},
		registry: {
			sources: {},
			indices: {},
		},
		get_items: get_items,
		get_index: get_index,
		pause_ready_event: pause_ready_event
	};
	//########################################################################

	function promise(){var a,b,c=new Promise(function(d,e){a=d;b=e;});c.resolve=a;c.reject=b;return c;}
	function split_list(str) {return str.replace(/、/g,',').replace(/[\s　]+/g,' ').trim().replace(/ *, */g, ',').split(',').filter(function(name) {return (name.length > 0);});}

	//------------------------------
	// Get the items specified by the configuration.
	//------------------------------
	function get_items(config, global_options) {
		// Default to WK 'subjects' only.
		if (!config) config = {wk_items:{}};

		// Allow comma-separated list of WK-only endpoints.
		if (typeof config === 'string') {
			var endpoints = split_list(config)
			var config = {wk_items:{options:{}}};
			for (var idx in endpoints)
				config.wk_items.options[endpoints[idx]] = true;
		}

		// Fetch the requested endpoints.
		var fetch_promise = promise();
		var items = [];
		var remaining = 0;
		for (var cfg_name in config) {
			var cfg = config[cfg_name];
			var spec = wkof.ItemData.registry.sources[cfg_name];
			if (!spec || typeof spec.fetcher !== 'function') {
				console.log('wkof.ItemData.get_items() - Config "'+cfg_name+'" not registered!');
				continue;
			}
			remaining++;
			spec.fetcher(cfg, global_options)
			.then(function(data){
				var filter_promise;
				if (typeof spec === 'object')
					filter_promise = apply_filters(data, cfg, spec);
				else
					filter_promise = Promise.resolve(data);
				filter_promise.then(function(data){
					items = items.concat(data);
					remaining--;
					if (!remaining) fetch_promise.resolve(items);
				});
			})
			.catch(function(e){
				if (e) throw e;
				console.log('wkof.ItemData.get_items() - Failed for config "'+cfg_name+'"');
				remaining--;
				if (!remaining) fetch_promise.resolve(items);
			});
		}
		if (remaining === 0) fetch_promise.resolve(items);
		return fetch_promise;
	}

	//------------------------------
	// Get the wk_items specified by the configuration.
	//------------------------------
	function get_wk_items(config, options) {
		var cfg_options = config.options || {};
		options = options || {};
		var now = new Date().getTime();

		// Endpoints that we can fetch (subjects MUST BE FIRST!!)
		var available_endpoints = ['subjects','assignments','review_statistics','study_materials'];
		var spec = wkof.ItemData.registry.sources.wk_items;
		for (var filter_name in config.filters) {
			var filter_spec = spec.filters[filter_name];
			if (!filter_spec || typeof filter_spec.set_options !== 'function') continue;
			var filter_cfg = config.filters[filter_name];
			filter_spec.set_options(cfg_options, filter_cfg.value);
		}

		// Fetch all of the endpoints
		var ep_promises = [];
		for (var idx in available_endpoints) {
			var ep_name = available_endpoints[idx];
			if (ep_name === 'subjects' || cfg_options[ep_name] === true)
				ep_promises.push(
					wkof.Apiv2.get_endpoint(ep_name, options)
					.then(process_data.bind(null, ep_name))
				);
		}
		return Promise.all(ep_promises)
		.then(function(all_data){
			return all_data[0];
		});

		//============
		function process_data(ep_name, ep_data) {
			if (ep_name === 'subjects') return ep_data;
			// Merge with 'subjects' when 'subjects' is done fetching.
			return ep_promises[0].then(cross_link.bind(null, ep_name, ep_data));
		}

		//============
		function cross_link(ep_name, ep_data, subjects) {
			for (var id in ep_data) {
				var record = ep_data[id];
				var subject_id = record.data.subject_id;
				subjects[subject_id][ep_name] = record.data;
			}
		}
	}

	//------------------------------
	// Filter the items array according to the specified filters and options.
	//------------------------------
	function apply_filters(items, config, spec) {
		var prep_promises = [];
		var options = config.options || {};
		var filters = [];
		var is_wk_items = (spec === wkof.ItemData.registry.sources.wk_items);
		for (var filter_name in config.filters) {
			var filter_cfg = config.filters[filter_name];
			if (typeof filter_cfg !== 'object' || filter_cfg.value === undefined)
				filter_cfg = {value:filter_cfg};
			var filter_value = filter_cfg.value;
			var filter_spec = spec.filters[filter_name];
			if (filter_spec === undefined) throw new Error('wkof.ItemData.get_item() - Invalid filter "'+filter_name+'"');
			if (typeof filter_spec.filter_value_map === 'function')
				filter_value = filter_spec.filter_value_map(filter_cfg.value);
			if (typeof filter_spec.prepare === 'function') {
				var result = filter_spec.prepare(filter_value);
				if (result instanceof Promise) prep_promises.push(result);
			}
			filters.push({
				name: filter_name,
				func: filter_spec.filter_func,
				filter_value: filter_value,
				invert: (filter_cfg.invert === true)
			});
		}
		if (is_wk_items && (options.include_hidden !== true)) {
			filters.push({
				name: 'remove_deleted',
				func: function(filter_value, item){return item.data.hidden_at === null;},
				filter_value: true,
				invert: false
			});
		}

		return Promise.all(prep_promises).then(function(){
			var result = [];
			var max_level = Math.max(wkof.user.subscription.max_level_granted, wkof.user.override_max_level || 0);
			for (var item_idx in items) {
				var keep = true;
				var item = items[item_idx];
				if (is_wk_items && (item.data.level > max_level)) continue;
				for (var filter_idx in filters) {
					var filter = filters[filter_idx];
					try {
						keep = filter.func(filter.filter_value, item);
						if (filter.invert) keep = !keep;
						if (!keep) break;
					} catch(e) {
						keep = false;
						break;
					}
				}
				if (keep) result.push(item);
			}
			return result;
		});
	}

	//------------------------------
	// Return the items indexed by an indexing function.
	//------------------------------
	function get_index(items, index_name) {
		var index_func = wkof.ItemData.registry.indices[index_name];
		if (typeof index_func !== 'function') throw new Error('wkof.ItemData.index_by() - Invalid index function "'+index_name+'"');
		return index_func(items);
	}

	//------------------------------
	// Register wk_items data source.
	//------------------------------
	wkof.ItemData.registry.sources['wk_items'] = {
		description: 'Wanikani',
		fetcher: get_wk_items,
		options: {
			assignments: {
				type: 'checkbox',
				label: 'Assignments',
				default: false,
				hover_tip: 'Include the "/assignments" endpoint (SRS status, burn status, progress dates)'
			},
			review_statistics: {
				type: 'checkbox',
				label: 'Review Statistics',
				default: false,
				hover_tip: 'Include the "/review_statistics" endpoint:\n  * Per-item review count\n  *Correct/incorrect count\n  * Longest streak'
			},
			study_materials: {
				type: 'checkbox',
				label: 'Study Materials',
				default: false,
				hover_tip: 'Include the "/study_materials" endpoint:\n  * User synonyms\n  * User notes'
			},
		},
		filters: {
			item_type: {
				type: 'multi',
				label: 'Item type',
				content: {radical:'Radicals',kanji:'Kanji',vocabulary:'Vocabulary'},
				default: [],
				filter_value_map: item_type_to_arr,
				filter_func: function(filter_value, item){return filter_value[item.object] === true;},
				hover_tip: 'Filter by item type (radical, kanji, vocabulary)',
			},
			level: {
				type: 'text',
				label: 'Level',
				placeholder: '(e.g. "1..3,5")',
				default: '',
				filter_value_map: levels_to_arr,
				filter_func: function(filter_value, item){return filter_value[item.data.level] === true;},
				hover_tip: 'Filter by Wanikani level\nExamples:\n  "*" (All levels)\n  "1..3,5" (Levels 1 through 3, and level 5)\n  "1..-1" (From level 1 to your current level minus 1)\n  "-5..+0" (Your current level and previous 5 levels)\n  "+1" (Your next level)',
			},
			srs: {
				type: 'multi',
				label: 'SRS Level',
				content: {lock:'Locked',init:'Initiate (Lesson Queue)',appr1:'Apprentice 1',appr2:'Apprentice 2',appr3:'Apprentice 3',appr4:'Apprentice 4',guru1:'Guru 1',guru2:'Guru 2',mast:'Master',enli:'Enlightened',burn:'Burned'},
				default: [],
				set_options: function(options){options.assignments = true;},
				filter_value_map: srs_to_arr,
				filter_func: function(filter_value, item){return filter_value[(item.assignments && item.assignments.unlocked_at ? item.assignments.srs_stage : -1)] === true;},
				hover_tip: 'Filter by SRS level (Apprentice 1, Apprentice 2, ..., Burn)',
			},
			have_burned: {
				type: 'checkbox',
				label: 'Have burned',
				default: true,
				set_options: function(options){options.assignments = true;},
				filter_func: function(filter_value, item){return (item.assignments.burned_at !== null) === filter_value;},
				hover_tip: 'Filter items by whether they have ever been burned.\n  * If checked, select burned items (including resurrected)\n  * If unchecked, select items that have never been burned',
			},
		}
	};

	//------------------------------
	// Macro to build a function to index by a specific field.
	// Set make_subarrays to true if more than one item can share the same field value (e.g. same item_type).
	//------------------------------
	function make_index_func(name, field, entry_type) {
		var fn = '';
		fn +=
			'var index = {}, value;\n'+
			'for (var idx in items) {\n'+
			'    var item = items[idx];\n'+
			'    try {\n'+
			'        value = '+field+';\n'+
			'    } catch(e) {continue;}\n'+
			'    if (value === null || value === undefined) continue;\n';
		if (entry_type === 'array') {
			fn +=
				'    if (index[value] === undefined) {\n'+
				'        index[value] = [item];\n'+
				'        continue;\n'+
				'    }\n';
		} else {
			fn +=
				'    if (index[value] === undefined) {\n'+
				'        index[value] = item;\n'+
				'        continue;\n'+
				'    }\n';
			if (entry_type === 'single_or_array') {
				fn +=
					'    if (!Array.isArray(index[value]))\n'+
					'        index[value] = [index[value]];\n';
			}
		}
		fn +=
			'    index[value].push(item);\n'+
			'}\n'+
			'return index;'
		wkof.ItemData.registry.indices[name] = new Function('items', fn);
	}

	// Build some index functions.
	make_index_func('item_type', 'item.object', 'array');
	make_index_func('level', 'item.data.level', 'array');
	make_index_func('slug', 'item.data.slug', 'single_or_array');
	make_index_func('srs_stage', '(item.assignments && item.assignments.unlocked_at ? item.assignments.srs_stage : -1)', 'array');
	make_index_func('srs_stage_name', '(item.assignments && item.assignments.unlocked_at ? item.assignments.srs_stage_name : "Locked")', 'array');
	make_index_func('subject_id', 'item.id', 'single');


	//------------------------------
	// Index by reading
	//------------------------------
	wkof.ItemData.registry.indices['reading'] = function(items) {
		var index = {};
		for (var idx in items) {
			var item = items[idx];
			if (!item.hasOwnProperty('data') || !item.data.hasOwnProperty('readings')) continue;
			if (!Array.isArray(item.data.readings)) continue;
			var readings = item.data.readings;
			for (var idx2 in readings) {
				var reading = readings[idx2].reading;
				if (reading === 'None') continue;
				if (!index[reading]) index[reading] = [];
				index[reading].push(item);
			}
		}
		return index;
	}

	//------------------------------
	// Given an array of item type criteria (e.g. ['rad', 'kan', 'voc']), return
	// an array containing 'true' for each item type contained in the criteria.
	//------------------------------
	function item_type_to_arr(filter_value) {
		var xlat = {rad:'radical',kan:'kanji',voc:'vocabulary'};
		var arr = {}, value;
		if (typeof filter_value === 'string') filter_value = split_list(filter_value);
		if (typeof filter_value !== 'object') return {};
		if (Array.isArray(filter_value)) {
			for (var idx in filter_value) {
				value = filter_value[idx];
				value = xlat[value] || value;
				arr[value] = true;
			}
		} else {
			for (value in filter_value) {
				arr[xlat[value] || value] = (filter_value[value] === true);
			}
		}
		return arr;
	}

	//------------------------------
	// Given an array of srs criteria (e.g. ['mast', 'enli', 'burn']), return an
	// array containing 'true' for each srs level contained in the criteria.
	//------------------------------
	function srs_to_arr(filter_value) {
		var index = ['lock','init','appr1','appr2','appr3','appr4','guru1','guru2','mast','enli','burn'];
		var arr = [], value;
		if (typeof filter_value === 'string') filter_value = split_list(filter_value);
		if (typeof filter_value !== 'object') return {};
		if (Array.isArray(filter_value)) {
			for (var idx in filter_value) {
				value = Number(filter_value[idx]);
				if (isNaN(value)) value = index.indexOf(filter_value[idx]) - 1;
				arr[value] = true;
			}
		} else {
			for (value in filter_value) {
				arr[index.indexOf(value) - 1] = (filter_value[value] === true);
			}
		}
		return arr;
	}

	//------------------------------
	// Given an level criteria string (e.g. '1..3,5,8'), return an array containing
	// 'true' for each level contained in the criteria.
	//------------------------------
	function levels_to_arr(filter_value) {
		var levels = [], crit_idx, start, stop, lvl;

		// Process each comma-separated criteria separately.
		var criteria = filter_value.split(',');
		for (crit_idx = 0; crit_idx < criteria.length; crit_idx++) {
			var crit = criteria[crit_idx];
			var value = true;

			// Match '*' = all levels
			var match = crit.match(/^\s*["']?\s*(\*)\s*["']?\s*$/);
			if (match !== null) {
				start = to_num('1');
				stop = to_num('9999'); // All levels
				for (lvl = start; lvl <= stop; lvl++)
					levels[lvl] = value;
				continue;
			}

			// Match 'a..b' = range of levels (or exclude if preceded by '!')
			match = crit.match(/^\s*["']?\s*(\!?)\s*((\+|-)?\d+)\s*(-|\.\.\.?|to)\s*((\+|-)?\d+)\s*["']?\s*$/);
			if (match !== null) {
				start = to_num(match[2]);
				stop = to_num(match[5]);
				if (match[1] === '!') value = false;
				for (lvl = start; lvl <= stop; lvl++)
					levels[lvl] = value;
				continue;
			}

			// Match 'a' = specific level (or exclude if preceded by '!')
			match = crit.match(/^\s*["']?\s*(\!?)\s*((\+|-)?\d+)\s*["']?\s*$/);
			if (match !== null) {
				lvl = to_num(match[2]);
				if (match[1] === '!') value = false;
				levels[lvl] = value;
				continue;
			}
			var err = 'wkof.ItemData::levels_to_arr() - Bad filter criteria "'+filter_value+'"';
			console.log(err);
			throw err;
		}
		return levels;

		//============
		function to_num(num) {
			num = (num[0] < '0' ? wkof.user.level : 0) + Number(num)
			return Math.min(Math.max(1, num), wkof.user.subscription.max_level_granted);
		}
	}

	var registration_promise;
	var registration_timeout;
	var registration_counter = 0;
	//------------------------------
	// Ask clients to add items to the registry.
	//------------------------------
	function call_for_registration() {
		registration_promise = promise();
		wkof.set_state('wkof.ItemData.registry', 'ready');
		setTimeout(check_registration_counter, 1);
		registration_timeout = setTimeout(function(){
			registration_timeout = undefined;
			check_registration_counter(true /* force_ready */);
		}, 3000);
		return registration_promise;
	}

	//------------------------------
	// Request to pause the 'ready' event.
	//------------------------------
	function pause_ready_event(value) {
		if (value === true) {
			registration_counter++;
		} else {
			registration_counter--;
			check_registration_counter();
		}
	}

	//------------------------------
	// If registration is complete or timed out, mark it as resolved.
	//------------------------------
	function check_registration_counter(force_ready) {
		if (!force_ready && registration_counter > 0) return false;
		if (registration_timeout !== undefined) clearTimeout(registration_timeout);
		registration_promise.resolve();
		return true;
	}

	//------------------------------
	// Notify listeners that we are ready.
	//------------------------------
	function notify_ready() {
		// Delay guarantees include() callbacks are called before ready() callbacks.
		setTimeout(function(){wkof.set_state('wkof.ItemData', 'ready');},0);
	}
	wkof.include('Apiv2');
	wkof.ready('Apiv2').then(call_for_registration).then(notify_ready);

})(this);
