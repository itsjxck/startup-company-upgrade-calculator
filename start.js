let _modPath
let modName = 'uc'
let modDisplayName = 'Upgrade Calculator'

exports.initialize = modPath => {
  _modPath = modPath

  Modding.setMenuItem({
    name: modName,
    tooltip: modDisplayName,
    tooltipPosition: 'top',
    faIcon: 'fa-calculator',
    badgeCount: 0
  })

  // Define custom view
  exports.views = [
    {
      name: modName,
      viewPath: _modPath + 'calculator.html',
      controller: UpgradeCalculatorViewController
    }
  ]
}

function UpgradeCalculatorViewController($rootScope) {
  let ctrl = this

  ctrl.upgradeCost = {}
  ctrl.totalUpgradeCost = {}
  ctrl.products = $rootScope.settings.products
  ctrl.product = ctrl.products[0]
  ctrl.upgradeScale = 1

  ctrl.selectProduct = product => (ctrl.product = product) && (ctrl.calculateFeatureUpgradeCosts())
  ctrl.setUpgradeScale = scale => ctrl.upgradeScale = scale
  ctrl.getFriendlyName = Helpers.GetFriendlyFeatureName
  ctrl.getComponent = requirement => Components.find(component => component.name == requirement)
  ctrl.isUserFeature = featureName => Features.find(feature => feature.name == featureName).categoryName == Enums.FeatureCategories.Users

  ctrl.calculateFeatureUpgradeCosts = () => {
    let cachedResourceCosts = {}

    let productFeatures = $rootScope.settings.featureInstances.filter(feature => feature.productId == ctrl.product.id)
    let upgradeableFeatures = productFeatures.filter(({ featureName }) => ctrl.isUserFeature(featureName))

    console.log('upgradeable:', upgradeableFeatures)

    let resourcesRequiredForUpgrade = reduceResources(upgradeableFeatures.map(feature => feature.requirements))

    let totalUpgradeCost = reduceResources(Object.keys(resourcesRequiredForUpgrade).map(resource => multiply(getResourceCost(resource), resourcesRequiredForUpgrade[resource])))

    ctrl.upgradeCost = arrayify(resourcesRequiredForUpgrade)
    ctrl.totalUpgradeCost = arrayify(reduceResources([totalUpgradeCost, resourcesRequiredForUpgrade]))

    console.log('required:', ctrl.upgradeCost)
    console.log('total:', ctrl.totalUpgradeCost)

    function arrayify(resources) {
      return Object.keys(resources).map(resource => ({ ...ctrl.getComponent(resource), amount: resources[resource] }))
    }

    function reduceResources(resources) {
      console.log('reducing:', resources)
      return resources.reduce((acc, res) => {
        Object.keys(res)
          .forEach(c =>
            acc[c]
              ? acc[c] += res[c]
              : acc[c] = res[c]
          )
        return acc
      }, {})
    }

    function multiply(resources, amount) {
      console.log('multiplying:', resources, 'by:', amount)
      Object.keys(resources).map(resource => resources[resource] * amount)
      console.log('mulitplied:', resources)
      return resources
    }

    function getResourceCost(resourceName) {
      if (cachedResourceCosts[resourceName]) {

        console.log('cache hit:', cachedResourceCosts[resourceName])
        return cachedResourceCosts[resourceName]

      } else {

        let resource = Components.find(c => c.name == resourceName)
        if (resource.type == Enums.ComponentTypes.Module) {

          // Is a module and has requirements
          let resourceCost = reduceResources(Object.keys(resource.requirements).map(requirement => multiply(getResourceCost(requirement), resource.requirements[requirement])))

          cachedResourceCosts[resourceName] = resourceCost
          return resourceCost

        } else {
          // Is a raw component
          return { [resourceName]: 1 }
        }
      }
    }
  }

  ctrl.calculateFeatureUpgradeCosts()

}