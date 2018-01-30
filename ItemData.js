// ==UserScript==
// @name        Wanikani Open Framework - Data module
// @namespace   rfindley
// @description Data module for Wanikani Open Framework
// @version     1.0.0
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
		registry: {},
		get_items: get_items, // Get items
	};

	//########################################################################

	function promise(){var a,b,c=new Promise(function(d,e){a=d;b=e;});c.resolve=a;c.reject=b;return c;}
	function split_list(str) {return str.replace(/^\s+|\s*(,)\s*|\s+$/g, '$1').split(',').filter(function(name) {return (name.length > 0);});}

	//------------------------------
	// Get the items specified by the configuration.
	//------------------------------
	function get_items(config) {
		var fetch_promise = promise();
		var items = [];
		var remaining = 0;
		for (var cfg_name in config) {
			var cfg = config[cfg_name];
			var spec = wkof.ItemData.registry[cfg_name];
			if (!spec || typeof spec.fetcher !== 'function') {
				console.log('wkof.ItemData.get_items() - Config "'+cfg_name+'" not registered!');
				continue;
			}
			remaining++;
			spec.fetcher(cfg)
			.then(function(data){
				if (typeof spec === 'object')
					data = apply_filters(data, cfg, spec);
				items = items.concat(data);
				remaining--;
				if (!remaining) fetch_promise.resolve(items);
			})
			.catch(function(){
				console.log('wkof.ItemData.get_items() - Failed for config "'+cfg_name+'"');
				remaining--;
				if (!remaining) fetch_promise.resolve(items);
			});
		}
		if (remaining === 0) fetch_promise.resolve(items);
		return fetch_promise;
	}

	var min_update_interval = 60;
	var wk_item_cache = {};
	//------------------------------
	// Get the wk_items specified by the configuration.
	//------------------------------
	function get_wk_items(config, options) {
		var cfg_options = config.options || {};
		options = options || {};
		var now = new Date().getTime();

		// Endpoints that we can fetch (subjects MUST BE FIRST!!)
		var available_endpoints = ['subjects','assignments','review_statistics','study_materials'];

		// Fetch all of the endpoints
		var ep_promises = [];
		for (var idx in available_endpoints) {
			var ep_name = available_endpoints[idx];
			if (ep_name === 'subjects' || cfg_options[ep_name] === true)
				ep_promises.push(fetch(ep_name));
		}
		return Promise.all(ep_promises)
		.then(function(all_data){
			return all_data[0];
		});

		function fetch(ep_name) {
			var ep = wk_item_cache[ep_name];
			// Return existing promise if we're in the middle of a fetch,
			// or if fetch is done and cache is still fresh.
			if (ep && (ep.ref_cnt > 1 || ((now - ep.last_update)/1000 < min_update_interval))) {
				ep.ref_cnt++;
				return ep.fetch_promise;
			}

			// Initialize cache.
			wk_item_cache[ep_name] = ep = {
				fetch_promise: promise(),
				ref_cnt: 1,
				last_update: now
			};

			// Fetch data.
			wkof.Apiv2.get_endpoint(ep_name, options)
			.then(process_data.bind(null, ep_name), ep.fetch_promise.reject);

			return ep.fetch_promise;
		}

		function process_data(ep_name, ep_data) {
			var ep = wk_item_cache[ep_name];
			if (ep_name === 'subjects') {
				ep.ref_cnt--;
				ep.fetch_promise.resolve(ep_data);
			} else {
				var subj_ep = wk_item_cache['subjects'];
				subj_ep.fetch_promise.then(cross_link.bind(null, ep_name, ep_data))
				.catch(function(error){
					ep.ref_cnt--;
					ep.fetch_promise.reject(error);
				});
			}
		}

		function cross_link(ep_name, ep_data, subjects) {
			var ep = wk_item_cache[ep_name];

			for (var id in ep_data) {
				var record = ep_data[id];
				var subject_id = record.data.subject_id;
				subjects[subject_id][ep_name] = record.data;
			}

			ep.ref_cnt--;
			ep.fetch_promise.resolve(ep_data);
		}
	}

	//------------------------------
	// Filter the items array according to the specified filters and options.
	//------------------------------
	function apply_filters(items, config, spec) {
		var options = config.options || {};
		var filters = [];
		for (var filter_name in config.filters) {
			var filter_cfg = config.filters[filter_name];
			var filter_value = filter_cfg.value;
			var filter_spec = spec.filters[filter_name];
			if (typeof filter_spec.filter_func !== 'function' ||
				(typeof filter_spec.option_req === 'function' && filter_spec.option_req(options) !== true))
				continue;
			if (typeof filter_spec.filter_value_map === 'function')
				filter_value = filter_spec.filter_value_map(filter_cfg.value);
			filters.push({
				name: filter_name,
				func: filter_spec.filter_func,
				filter_value: filter_value,
				invert: (filter_cfg.invert === true)
			});
		}
		var result = [];
		for (var item_idx in items) {
			var keep = true;
			var item = items[item_idx];
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
	}

	//------------------------------
	// Register wk_items data source.
	//------------------------------
	wkof.ItemData.registry['wk_items'] = {
		type: 'items_source',
		description: 'Wanikani Item Data',
		fetcher: get_wk_items,
		options: {
			assignments: {
				type: 'checkbox',
				label: 'SRS status, burn status, progress dates',
				default: false
			},
			review_statistics: {
				type: 'checkbox',
				label: 'Review statistics',
				default: false
			},
			study_materials: {
				type: 'checkbox',
				label: 'Synonyms and notes',
				default: false
			},
		},
		filters: {
			item_type: {
				type: 'multi',
				label: 'Item type',
				content: {radical:'Radicals',kanji:'Kanji',voculary:'Vocabulary'},
				default: ['rad','kan','voc'],
				filter_value_map: item_type_to_arr,
				filter_func: function(filter_value, item){return filter_value[item.object] === true;}
			},
			level: {
				type: 'text',
				label: 'Level',
				placeholder: '(e.g. &quot;1-3,5&quot;)',
				default: '1-60',
				filter_value_map: levels_to_arr,
				filter_func: function(filter_value, item){return filter_value[item.data.level] === true;}
			},
			srs: {
				type: 'multi',
				label: 'SRS Level',
				content: {appr1:'Apprentice 1',appr2:'Apprentice 2',appr3:'Apprentice 3',app4:'Apprentice 4',guru1:'Guru 1',guru2:'Guru 2',mast:'Master',enli:'Enlightened',burn:'Burned'},
				default: [],
				filter_value_map: srs_to_arr,
				filter_func: function(filter_value, item){return filter_value[item.assignments.srs_stage] === true;}
			},
			have_burned: {
				type: 'checkbox',
				label: 'Have burned',
				default: true,
				option_req: function(options){return (options && (options.assignments === true));},
				filter_func: function(filter_value, item){return (item.assignments.burned_at !== null) === filter_value;}
			},
		}
	};

	//------------------------------
	// Given an array of item type criteria (e.g. ['rad', 'kan', 'voc']), return
	// an array containing 'true' for each item type contained in the criteria.
	//------------------------------
	function item_type_to_arr(filter_value) {
		return {
			radical: (filter_value.indexOf('rad') >= 0),
			kanji: (filter_value.indexOf('kan') >= 0),
			vocabulary: (filter_value.indexOf('voc') >= 0)
		}
	}

	//------------------------------
	// Given an array of srs criteria (e.g. ['mast', 'enli', 'burn']), return an
	// array containing 'true' for each srs level contained in the criteria.
	//------------------------------
	function srs_to_arr(filter_value) {
		return ['init','appr1','appr2','appr3','appr4','guru1','guru2','mast','enli','burn']
			.map(function(name){
				return filter_value.indexOf(name) >= 0;
			});
	}

	//------------------------------
	// Given an level criteria string (e.g. '1-3,5,8'), return an array containing
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
			var match = crit.match(/^\s*(\*)\s*$/);
			if (match !== null) {
				start = to_num('1');
				stop = to_num('9999'); // All levels
				for (lvl = start; lvl <= stop; lvl++)
					levels[lvl] = value;
				continue;
			}

			// Match 'a-b' = range of levels (or exclude if preceded by '!')
			match = crit.match(/^\s*(\!?)\s*((\+|-)?\d+)\s*-\s*((\+|-)?\d+)\s*$/);
			if (match !== null) {
				start = to_num(match[2]);
				stop = to_num(match[4]);
				if (match[1] === '!') value = false;
				for (lvl = start; lvl <= stop; lvl++)
					levels[lvl] = value;
				continue;
			}

			// Match 'a' = specific level (or exclude if preceded by '!')
			match = crit.match(/^\s*(\!?)\s*((\+|-)?\d+)\s*$/);
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

		function to_num(num) {
			num = (num[0] < '0' ? wkof.user.level : 0) + Number(num)
			return Math.min(Math.max(1, num), wkof.user.max_level_granted_by_subscription);
		}
	}

	//------------------------------
	// Notify listeners that we are ready.
	//------------------------------
	function notify_ready() {
		// Delay guarantees include() callbacks are called before ready() callbacks.
		setTimeout(function(){wkof.set_state('wkof.ItemData', 'ready');},0);
	}
	wkof.include('Apiv2');
	wkof.ready('Apiv2').then(notify_ready);

})(this);

