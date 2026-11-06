// ==UserScript==
// @name        Wanikani Open Framework - Apiv2 module
// @namespace   rfindley
// @description Apiv2 module for Wanikani Open Framework
// @version     1.0.15
// @copyright   2018+, Robin Findley
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

(function(global) {

	//########################################################################
	//------------------------------
	// Published interface.
	//------------------------------
	global.wkof.Apiv2 = {
		clear_cache: clear_cache,
		fetch_endpoint: fetch_endpoint,
		get_endpoint: get_endpoint,
		is_valid_apikey_format: is_valid_apikey_format,
		spoof: override_key,
	};
	//########################################################################

	function promise(){let a,b,c=new Promise(function(d,e){a=d;b=e;});c.resolve=a;c.reject=b;return c;}

	let using_apikey_override = false;
	let skip_username_check = false;

	//------------------------------
	// Set up an API key to spoof for testing
	//------------------------------
	function override_key(key) {
		if (is_valid_apikey_format(key)) {
			localStorage.setItem('apiv2_key_override', key);
		} else if (key === undefined) {
			let key = localStorage.getItem('apiv2_key_override');
			if (key === null) {
				console.log('Not currently spoofing.');
			} else {
				console.log(key);
			}
		} else if (key === '') {
			localStorage.removeItem('apiv2_key_override');
		} else {
			console.log('That\'s not a valid key!');
		}
	}

	//------------------------------
	// Retrieve the username from the page.
	//------------------------------
	function get_username() {
		try {
			return document.querySelector('.user-summary__username').textContent.trim();
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
	function clear_cache(include_non_user) {
		let clear_promises = [];
		let dir = wkof.file_cache.dir;
		for (let filename in wkof.file_cache.dir) {
			if (!filename.match(/^Apiv2\./)) continue;
			if ((filename === 'Apiv2.subjects' && include_non_user !== true) || !dir[filename]) continue;
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

	wkof.set_state('wkof.Apiv2.key', 'not_ready');

	//------------------------------
	// Get the API key (either from localStorage, or from the Account page).
	//------------------------------
	function get_apikey() {
		// If we already have the apikey, just return it.
		if (is_valid_apikey_format(wkof.Apiv2.key))
			return Promise.resolve(wkof.Apiv2.key);

		// If we don't have the apikey, but override was requested, return error.
		if (using_apikey_override) 
			return Promise.reject('Invalid api2_key_override in localStorage!');

		// Fetch the apikey from the account page.
		console.log('Fetching API key...');
		wkof.set_state('wkof.Apiv2.key', 'fetching');
		return wkof.load_file('/settings/personal_access_tokens')
		.then(parse_page);

		function parse_page(html){
			let page = new DOMParser().parseFromString(html, 'text/html');
			let apikey = page.querySelector('.api-tokens__tokens .wk-code')?.textContent.trim() || '';
			if (!wkof.Apiv2.is_valid_apikey_format(apikey)) {
				let status = localStorage.getItem('wkof_generate_token');
				if (status === null) {
					if (confirm("It looks like you haven't generated a Personal Access Token yet,\nwhich is required to run Open Framework scripts.\nDo you want to generate one now?")) {
						return generate_apiv2_key();
					} else {
						localStorage.setItem('wkof_generate_token', 'ignore');
					}
				} else if (status === "ignore") {
					wkof.Menu.insert_script_link({
						name: 'gen_apiv2_key',
						title: 'Generate APIv2 key',
					    on_click: generate_apiv2_key
					});
				}
				return Promise.reject('No API key (version 2) found on account page!');
			} else {
				delete localStorage.wkof_generate_token;
			}

			// Store the api key.
			wkof.Apiv2.key = apikey;
			localStorage.setItem('apiv2_key', apikey);
			wkof.set_state('wkof.Apiv2.key', 'ready');
			return apikey;
		};

		function generate_apiv2_key()
		{
			localStorage.setItem('wkof_generate_token', 'generating');
			return wkof.load_file('/settings/personal_access_tokens/new')
			.then(parse_token_page).then(function(){
				location.reload();
			});
		}

		function parse_token_page(html) {
			let page = new DOMParser().parseFromString(html, 'text/html');
			let form = page.querySelector('.wk-form');
			let hidden_inputs = Array.from(form.querySelectorAll('input[type="hidden"][name="authenticity_token"]'));
			let checkboxes = Array.from(form.querySelectorAll('input[type="checkbox"]'));
			let submit_url = form.attributes['action'].value;
			let data = [].concat(
				hidden_inputs.map((elem) => [elem.attributes.name.value, elem.attributes.value.value]),
				[['description', 'Open+Framework+%28read-only%29']],
				checkboxes.map((elem) => [elem.attributes.name.value, '0']),
				[['button','']]
			).map((kv)=>kv.map(encodeURIComponent).join('=')).join('&');

			return fetch(submit_url, {
				method:'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
				},
				body: data
			});
		}
	}

	//------------------------------
	// Fetch a URL asynchronously, and pass the result as resolved Promise data.
	//------------------------------
	function fetch_endpoint(endpoint, options) {
		let retry_cnt, endpoint_data, url, headers;
		let progress_data = {name:'wk_api_'+endpoint, label:'Wanikani '+endpoint, value:0, max:100};
		let bad_key_cnt = 0;

		// Parse options.
		if (!options) options = {};
		let filters = options.filters;
		if (!filters) filters = {};
		let progress_callback = options.progress_callback;

		// Get timestamp of last fetch from options (if specified)
		let last_update = options.last_update;

		// If no prior fetch... (i.e. no valid last_update)
		if (typeof last_update !== 'string' && !(last_update instanceof Date)) {
			// If updated_after is present, use it.  Otherwise, default to ancient date.
			if (filters.updated_after === undefined)
				last_update = '1999-01-01T01:00:00.000000Z';
			else
				last_update = filters.updated_after;
		}
		// If last_update is a Date object, convert it to ISO string.
		// If it's a string, but not an ISO string, try converting to an ISO string.
		if (last_update instanceof Date)
			last_update = last_update.toISOString().replace(/Z$/,'000Z');
		else if (last_update.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/) === null)
			last_update = new Date(last_update).toISOString().replace(/Z$/,'000Z');

		// Set up URL and headers
		url = "https://api.wanikani.com/v2/" + endpoint;

		// Add user-specified data filters to the URL
		filters.updated_after = last_update;
		let arr = [];
		for (let name in filters) {
			let value = filters[name];
			if (Array.isArray(value)) value = value.join(',');
			arr.push(name+'='+value);
		}
		url += '?'+arr.join('&');

		// Get API key and fetch the data.
		let fetch_promise = promise();
		get_apikey()
		.then(setup_and_fetch);

		return fetch_promise;

		//============
		function setup_and_fetch() {
			if (options.disable_progress_dialog !== true) wkof.Progress.update(progress_data);
			headers = {
			//	'Wanikani-Revision': '20170710', // Placeholder?
				'Authorization': 'Bearer '+wkof.Apiv2.key,
			};
			headers['If-Modified-Since'] = new Date(last_update).toUTCString(last_update);

			retry_cnt = 0;
			fetch();
		}

		//============
		function fetch() {
			retry_cnt++;
			let request = new XMLHttpRequest();
			request.onreadystatechange = received;
			request.open('GET', url, true);
			for (let key in headers)
				request.setRequestHeader(key, headers[key]);
			request.send();
		}

		//============
		function received(event) {
			// ReadyState of 4 means transaction is complete.
			if (this.readyState !== 4) return;

			// Check for rate-limit error.  Delay and retry if necessary.
			if (this.status === 429 && retry_cnt < 40) {
				// Check for "ratelimit-reset" header. Delay until the specified time.
				let resetTime = parseInt(this.getResponseHeader("ratelimit-reset"));
				if (resetTime) {
					let timeRemaining = (resetTime * 1000) - Date.now();
					setTimeout(fetch, timeRemaining + 500);
				} else {
					let delay = Math.min((retry_cnt * 250), 2000);
					setTimeout(fetch, delay);
				}
				return;
			}

			// Check for bad API key.
			if (this.status === 401) return bad_apikey();

			// Check of 'no updates'.
			if (this.status >= 300) {
				if (typeof progress_callback === 'function')
					progress_callback(endpoint, 0, 1, 1);
				progress_data.value = 1;
				progress_data.max = 1;
				if (options.disable_progress_dialog !== true) wkof.Progress.update(progress_data);
				return fetch_promise.reject({status:this.status, url:url});
			}

			// Process the response data.
			let json = JSON.parse(event.target.response);

			// Data may be a single object, or collection of objects.
			// Collections are paginated, so we may need more fetches.
			if (json.object === 'collection') {
				// It's a multi-page endpoint.
				let first_new, so_far, total;
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

				// Call the 'progress' callback.
				if (typeof progress_callback === 'function')
					progress_callback(endpoint, first_new, so_far, total);
				progress_data.value = so_far;
				progress_data.max = total;
				if (options.disable_progress_dialog !== true) wkof.Progress.update(progress_data);

				// If there are more pages, fetch the next one.
				if (json.pages.next_url !== null) {
					retry_cnt = 0;
					url = json.pages.next_url;
					fetch();
					return;
				}

				// This was the last page.  Return the data.
				fetch_promise.resolve(endpoint_data);

			} else {
				// Single-page result.  Report single-page progress, and return data.
				if (typeof progress_callback === 'function')
					progress_callback(endpoint, 0, 1, 1);
				progress_data.value = 1;
				progress_data.max = 1;
				if (options.disable_progress_dialog !== true) wkof.Progress.update(progress_data);
				fetch_promise.resolve(json);
			}
		}

		//============
		function bad_apikey(){
			// If we are using an override key, abort and return error.
			if (using_apikey_override) {
				fetch_promise.reject('Wanikani doesn\'t recognize the apiv2_key_override key ("'+wkof.Apiv2.key+'")');
				return;
			}

			// If bad key received too many times, abort and return error.
			bad_key_cnt++;
			if (bad_key_cnt > 1) {
				fetch_promise.reject('Aborting fetch: Bad key reported multiple times!');
				return;
			}

			// We received a bad key.  Report on the console, then try fetching the key (and data) again.
			console.log('Seems we have a bad API key.  Erasing stored info.');
			localStorage.removeItem('apiv2_key');
			wkof.Apiv2.key = undefined;
			get_apikey()
			.then(populate_user_cache)
			.then(setup_and_fetch);
		}
	}


	let min_update_interval = 60;
	let ep_cache = {};

	//------------------------------
	// Get endpoint data from cache with updates from API.
	//------------------------------
	function get_endpoint(ep_name, options) {
		if (!options) options = {};

		// We cache data for 'min_update_interval' seconds.
		// If within that interval, we return the cached data.
		// User can override cache via "options.force_update = true"
		let ep_info = ep_cache[ep_name];
		if (ep_info) {
			// If still awaiting prior fetch return pending promise.
			// Also, not force_update, return non-expired cache (i.e. resolved promise)
			if (options.force_update !== true || ep_info.timer === undefined)
				return ep_info.promise;
			// User is requesting force_update, and we have unexpired cache.
			// Clear the expiration timer since we will re-fetch anyway.
			clearTimeout(ep_info.timer);
		}

		// Create a promise to fetch data.  The resolved promise will also serve as cache.
		let get_promise = promise();
		ep_cache[ep_name] = {promise: get_promise};

		// Make sure the requested endpoint is valid.
		let merged_data;

		// Perform the fetch, and process the data.
		wkof.file_cache.load('Apiv2.'+ep_name)
		.then(fetch, fetch);
		return get_promise;

		//============
		function fetch(cache_data) {
			if (typeof cache_data === 'string') cache_data = {last_update:null};
			merged_data = cache_data;
			let fetch_options = Object.assign({}, options);
			fetch_options.last_update = cache_data.last_update;
			fetch_endpoint(ep_name, fetch_options)
			.then(process_api_data, handle_error);
		}

		//============
		function process_api_data(fetched_data) {
			// Mark the data with the last_update timestamp reported by the server.
			if (fetched_data.data_updated_at !== null) merged_data.last_update = fetched_data.data_updated_at;

			// Process data according to whether it is paginated or not.
			if (fetched_data.object === 'collection') {
				if (merged_data.data === undefined) merged_data.data = {};
				for (let idx = 0; idx < fetched_data.data.length; idx++) {
					let item = fetched_data.data[idx];
					merged_data.data[item.id] = item;
				}
			} else {
				merged_data.data = fetched_data.data;
			}

			// If it's the 'user' endpoint, we insert the apikey before caching.
			if (ep_name === 'user') merged_data.data.apikey = wkof.Apiv2.key;

			// Save data to cache and finish up.
			wkof.file_cache.save('Apiv2.'+ep_name, merged_data)
			.then(finish);
		}

		//============
		function finish() {
			// Return the data, then set up a cache expiration timer.
			get_promise.resolve(merged_data.data);
			ep_cache[ep_name].timer = setTimeout(expire_cache, min_update_interval*1000);
		}

		//============
		function expire_cache() {
			// Delete the data from cache.
			delete ep_cache[ep_name];
		}

		//============
		function handle_error(error) {
			if (typeof error === 'string')
				get_promise.reject(error);
			if (error.status >= 300 && error.status <= 399)
				finish();
			else
				get_promise.reject('Error '+error.status+' fetching "'+error.url+'"');
		}
	}

	//########################################################################
	//------------------------------
	// Make sure user cache matches the current (or override) user.
	//------------------------------
	function validate_user_cache() {
		let user = get_username();
		if (!user) {
			// Username unavailable if not logged in, or if on Lessons or Reviews pages.
			// If not logged in, stop running the framework.
			if (location.pathname.match(/^(\/|\/login)$/) !== null)
				return Promise.reject('Couldn\'t extract username from user menu!  Not logged in?');
			skip_username_check = true;
		}

		let apikey = localStorage.getItem('apiv2_key_override');
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
		.then(process_user_info)
		.catch(retry);

		//============
		function process_user_info(user_info) {
			// If cache matches, we're done.
			if (user_info.data.apikey === wkof.Apiv2.key) {
				// We don't check username when using override key.
				if (using_apikey_override || skip_username_check || (user_info.data.username === user)) {
					wkof.Apiv2.user = user_info.data.username;
					return populate_user_cache();
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
		}

		//============
		function retry() {
			// Either empty cache, or user mismatch.  Fetch key, then populate cache.
			return get_apikey().then(clear_cache).then(populate_user_cache);
		}
	}

	//------------------------------
	// Populate the user info into cache.
	//------------------------------
	function populate_user_cache() {
		return fetch_endpoint('user')
		.then(function(user_info){
			// Store the apikey in the cache.
			user_info.data.apikey = wkof.Apiv2.key;
			wkof.Apiv2.user = user_info.data.username;
			wkof.user = user_info.data
			return wkof.file_cache.save('Apiv2.user', user_info);
		});
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
	wkof.include('Progress');
	wkof.ready('document,Progress').then(startup);
	function startup() {
		validate_user_cache()
		.then(notify_ready);
	}

})(window);
