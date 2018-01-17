// ==UserScript==
// @name        Wanikani Open Framework - Apiv2 module
// @namespace   rfindley
// @description Apiv2 module for Wanikani Open Framework
// @version     1.0.0
// @copyright   2018+, Robin Findley
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

(function(global) {

	// Don't allow multiple instances of this script.
	if (global.wkof.Apiv2 !== undefined) return;

	//########################################################################
	//------------------------------
	// Published interface.
	//------------------------------
	global.wkof.Apiv2 = {
		clear_cache: clear_cache,       // Clear the user cache
		fetch_endpoint: fetch_endpoint, // Fetch a complete API endpoint, including pagination
		get_apikey: get_apikey,         // Get the API key (via Promise)
		get_endpoint: get_endpoint,     // Scripts can signal which API endpoints they need
		is_valid_apikey_format: is_valid_apikey_format, // Check if string is a valid API key
		print_apikey: print_apikey,     // Output the API key to the console
	};

	//########################################################################
	function promise(){var a,b,c=new Promise(function(d,e){a=d;b=e;});c.resolve=a;c.reject=b;return c;}

	var available_endpoints = [
		'assignments','level_progressions','resets','review_statistics',
		'reviews','study_materials','subjects','summary','user'
	];
	var using_apikey_override = false;
	var tried_fetching_apikey = false;

	//------------------------------
	// Retrieve the username from the page.
	//------------------------------
	function get_username() {
		try {
			return ($('.account a[href^="/users/"]').attr('href') || '').match(/[^\/]+$/)[0];
		} catch(e) {
			return undefined;
		}
	}

	//------------------------------
	// Check if a string is a valid apikey format.
	//------------------------------
	function is_valid_apikey_format(str) {
		return ((typeof str === 'string') &&
			(str.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) !== null));
	}

	//------------------------------
	// Clear any datapoint cache not belonging to the current user.
	//------------------------------
	function clear_cache() {
		var clear_promises = [];
		var dir = wkof.file_cache.dir;
		for (var idx in available_endpoints) {
			var endpoint = available_endpoints[idx];
			if (endpoint === 'subjects') continue;
			var filename = 'Apiv2.'+endpoint;
			var file = dir[filename];
			if (!file) continue;
			clear_promises.push(filename);
		}
		clear_promises = clear_promises.map(delete_file);

		if (clear_promises.length > 0) {
			console.log('Clearing user cache...');
			return Promise.all(clear_promises);
		} else {
			return Promise.resolve();
		}

		function delete_file(filename){
			return wkof.file_cache.delete(filename);
		}
	}

	//------------------------------
	// Fetch the API key from the Account page.
	//------------------------------
	function fetch_key() {
		console.log('Fetching API key...');
		return wkof.load_file('https://www.wanikani.com/settings/account')
		.then(function(page){
			var page = $(page);
			var apikey = page.find('#user_api_key_v2').val();
			if (wkof.Apiv2.is_valid_apikey_format(apikey)) {
				wkof.Apiv2.key = apikey;
				localStorage.setItem('apiv2_key', apikey);
				return apikey;
			} else {
				return Promise.reject('No API key (version 2) found on account page!');
			}
		});
	}

	//------------------------------
	// Get the API key (either from localStorage, or from the Account page).
	//------------------------------
	function get_apikey() {
		if (is_valid_apikey_format(wkof.Apiv2.key))
			return Promise.resolve(wkof.Apiv2.key);
		wkof.set_state('wkof.Apiv2.key', 'fetching');
		return fetch_key().then(function(apikey){
			wkof.set_state('wkof.Apiv2.key', 'ready');
			return apikey;
		});
	}

	//------------------------------
	// Print the apikey on the console.
	//------------------------------
	function print_apikey() {
		get_apikey()
		.then(function(apikey){
			console.log('Apiv2 key = "'+apikey+'"')
		});
	}

	//------------------------------
	// Fetch a URL asynchronously, and pass the result as resolved Promise data.
	//------------------------------
	function fetch_endpoint(endpoint, filters, last_update, progress_callback) {
		var fetch_promise = promise();
		var retry_cnt, endpoint_data, url, headers;
		var bad_key_cnt = 0;

		get_apikey()
		.then(setup_and_fetch);

		return fetch_promise;

		function setup_and_fetch() {
			if (!filters) filters = {};
			if (typeof last_update !== 'string') {
				if (filters.updated_after === undefined)
					last_update = '1999-01-01T01:00:00.000000Z';
				else
					last_update = filters.updated_after;
			}

			url = "https://www.wanikani.com/api/v2/" + endpoint;
			headers = {
//				'Wanikani-Revision': '20170710',
				'Authorization': 'Bearer '+wkof.Apiv2.key,
			};
			headers['If-Modified-Since'] = new Date(last_update).toUTCString(last_update);

			filters.updated_after = last_update;
			var arr = [];
			for (var name in filters) {
				var value = filters[name];
				if (Array.isArray(value)) value = value.join(',');
				arr.push(name+'='+value);
			}
			url += '?'+arr.join('&');

			retry_cnt = 0;
			fetch();
		}

		function fetch() {
			retry_cnt++;
			var request = new XMLHttpRequest();
			request.onreadystatechange = received;
			request.open('GET', url, true);
			for (var key in headers)
				request.setRequestHeader(key, headers[key]);
			request.send();
		}

		function received(event) {
			if (this.readyState !== 4) return;
			if (this.status === 429 && retry_cnt < 40) {
				var delay = Math.min((retry_cnt * 250), 2000);
				setTimeout(fetch, delay);
				return;
			}
			if (this.status === 401) return bad_apikey();
			if (this.status >= 300) return fetch_promise.reject({status:this.status, url:url});
			var json = JSON.parse(event.target.response);

			if (json.object === 'collection') {
				// Multi-page endpoint.
				var first_new, so_far, total;
				if (endpoint_data === undefined) {
					// First page of results.
					first_new = 0;
					so_far = json.data.length;
				} else {
					// Nth page of results.
					first_new = endpoint_data.data.length;
					so_far = first_new + json.data.length;
					json.data = endpoint_data.data.concat(json.data);
				}
				endpoint_data = json;
				total = json.total_count;
				if (typeof progress_callback === 'function')
					progress_callback(endpoint, first_new, so_far, total);
				if (json.pages.next_url === null) {
					fetch_promise.resolve(endpoint_data);
				} else {
					retry_cnt = 0;
					url = json.pages.next_url;
					fetch();
				}
			} else {
				// Single-page result.
				if (typeof progress_callback === 'function')
					progress_callback(endpoint, 0, 1, 1);
				fetch_promise.resolve(json);
			}
		}

		function bad_apikey(){
			if (using_apikey_override) {
				fetch_promise.reject('Wanikani doesn\'t recognize the apiv2_key_override key ("'+wkof.Apiv2.key+'")');
				return;
			}
			bad_key_cnt++;
			if (bad_key_cnt > 1) {
				fetch_promise.reject('Aborting fetch: Bad key reported multiple times!');
				return;
			}
			console.log('Seems we have a bad API key.  Erasing stored info.');
			localStorage.removeItem('apiv2_key');
			wkof.Apiv2.key = undefined;
			fetch_key()
			.then(populate_user_cache)
			.then(get_apikey)
			.then(setup_and_fetch);
		}
	}

	wkof.set_state('wkof.Apiv2.key', 'not_ready');

	//------------------------------
	// Get endpoint data from cache with updates from API.
	//------------------------------
	function get_endpoint(ep_name, progress_callback) {
		var get_promise = promise();
		var merged_data;
		if (available_endpoints.indexOf(ep_name) < 0) {
			get_promise.reject(new Error('Invalid endpoint name "'+ep_name+'"'));
			return get_promise;
		}

		wkof.file_cache.load('Apiv2.'+ep_name)
		.then(fetch, fetch);
		return get_promise;

		function fetch(cache_data) {
			if (typeof cache_data === 'string') cache_data = {last_update:null};
			merged_data = cache_data;
			fetch_endpoint(ep_name, null, cache_data.last_update, progress_callback)
			.then(process_api_data, handle_error);
		}

		function process_api_data(fetched_data) {
			if (fetched_data.data_updated_at !== null) merged_data.last_update = fetched_data.data_updated_at;
			if (fetched_data.object === 'collection') {
				if (merged_data.data === undefined) merged_data.data = {};
				for (var idx = 0; idx < fetched_data.data.length; idx++) {
					var item = fetched_data.data[idx];
					merged_data.data[item.id] = item;
				}
			} else {
				merged_data.data = fetched_data.data;
			}
			if (ep_name === 'user') merged_data.data.apikey = wkof.Apiv2.key;
			wkof.file_cache.save('Apiv2.'+ep_name, merged_data)
			.then(get_promise.resolve.bind(null, merged_data.data));
		}

		function handle_error(error) {
			if (typeof error === 'string')
				get_promise.reject(error);
			if (error.status >= 300 && error.status <= 399)
				get_promise.resolve(merged_data.data);
			else
				get_promise.reject('Error '+error.status+' fetching "'+error.url+'"');
		}
	}

	//########################################################################
	//------------------------------
	// Make sure user cache matches the current (or override) user.
	//------------------------------
	function validate_user_cache() {
		var user = get_username();
		if (!user) return Promise.reject('Couldn\'t extract username from user menu!');

		var apikey = localStorage.getItem('apiv2_key_override');
		if (apikey !== null) {
			// It looks like we're trying to override the apikey (e.g. for debug)
			using_apikey_override = true;
			if (!is_valid_apikey_format(apikey)) {
				return Promise.reject('Invalid api2_key_override in localStorage!');
			}
			console.log('Using apiv2_key_override key ('+apikey+')');
		} else {
			// Use regular apikey (versus override apikey)
			apikey = localStorage.getItem('apiv2_key');
			if (!is_valid_apikey_format(apikey)) apikey = undefined;
		}

		wkof.Apiv2.key = apikey;

		// Make sure cache is still valid
		return wkof.file_cache.load('Apiv2.user')
		.then(function(user_info){
			// If cache matches, we're done.
			if (user_info.data.apikey === wkof.Apiv2.key) {
				if (using_apikey_override || (user_info.data.username === user)) {
					wkof.Apiv2.user = user_info.data.username;
					return;
				}
			}
			// Cache doesn't match.
			if (!using_apikey_override) {
				// Fetch the key from the accounts page.
				wkof.Apiv2.key = undefined;
				throw 'fetch key';
			} else {
				// We're using override.  No need to fetch key, just populate cache.
				return clear_cache().then(populate_user_cache);
			}
		})
		.catch(function(){
			// Either empty cache, or user mismatch.  Fetch key, then populate cache.
			return fetch_key().then(clear_cache).then(populate_user_cache);
		});

	}

	//------------------------------
	// Populate the user info into cache.
	//------------------------------
	function populate_user_cache() {
		console.log('Fetching user info...');
		return fetch_endpoint('user')
		.then(function(data){
			// Store the apikey in the cache.
			data.data.apikey = wkof.Apiv2.key;
			wkof.Apiv2.user = data.data.username;
			console.log('Caching user info...');
			return wkof.file_cache.save('Apiv2.user', data);
		})
	}

	//------------------------------
	// Do initialization once document is loaded.
	//------------------------------
	function notify_ready() {
		// Notify listeners that we are ready.
		// Delay guarantees include() callbacks are called before ready() callbacks.
		setTimeout(function(){wkof.set_state('wkof.Apiv2', 'ready');},0);
	}

	//------------------------------
	// Do initialization once document is loaded.
	//------------------------------
	wkof.ready('document').then(startup);
	function startup() {
		validate_user_cache()
		.then(notify_ready);
	}

})(window);

