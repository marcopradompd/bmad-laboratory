// Sanitizes known tracking URL params before other scripts read them. Runs at bootstrap and must
// never throw or block page load, hence the intentional silent catch below.
;(function () {
  try {
    var search = window.location.search
    if (!search) return

    var parameters = new URLSearchParams(search)
    // Keep this list in sync with TRACKING_PARAMS_LIST in utils/sanitizeTrackingParams.ts.
    var trackingKeys = [
      'gclid', // Google Ads click identifier
      'fbclid', // Meta click identifier
      'gbraid', // Google Ads aggregate attribution identifier
      'wbraid', // Google Ads web-to-app attribution identifier
      'msclkid', // Microsoft Advertising click identifier
      'clickid', // Generic affiliate or advertising partner identifier
      'epik', // Pinterest click identifier
      'ttclid', // TikTok click identifier
      'rdt_cid', // Reddit click identifier
      'gad_source', // Google Ads source marker
      'gad_campaignid', // Google Ads campaign identifier
    ]
    // Values are already decoded once. Excluding "%" prevents a nested encoding such as
    // "%253C" from surviving as "%3C" for another consumer to decode.
    var disallowedCharsRegex = /[^a-zA-Z0-9_\-\.=:]/g

    for (var i = 0; i < trackingKeys.length; i++) {
      var key = trackingKeys[i]
      var allValues = parameters.getAll(key)
      if (allValues.length === 0) continue
      parameters.delete(key)
      for (var j = 0; j < allValues.length; j++) {
        parameters.append(key, allValues[j].replace(disallowedCharsRegex, ''))
      }
    }

    var queryParameters = parameters.toString() ? '?' + parameters.toString() : ''
    var newUrl = window.location.pathname + queryParameters + window.location.hash
    history.replaceState(null, '', newUrl)
  } catch {}
})()
