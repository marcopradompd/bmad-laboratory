;(function () {
  var dataLayer = (window.dataLayer = window.dataLayer || [])

  // @ts-ignore TODO: describe the type
  window.gtag = function () {
    dataLayer.push(arguments)
  }

  window.gtag('consent', 'default', {
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    ad_storage: 'denied',
    analytics_storage: 'denied',
  })
})()
