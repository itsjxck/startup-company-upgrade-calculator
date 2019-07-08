let _modPath
let modName = 'uc'
let modDisplayName = 'Upgrade Calculator'

const log = (...message) => console.log(`[${modDisplayName}]:`, ...message)

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

exports.onLoadGame = async () => {
  Components
    .filter(({ type }) => type == Enums.ComponentTypes.Module)
    .forEach(m => m.friendlyReqs = convertToFriendly(m.requirements))

  log('calculating resource costs')
  calculateModuleCosts()
}

function convertToFriendly(resources) {
  return Object
    .keys(resources)
    .map(name => ({
      name,
      amount: resources[name],
      type: Components.find(c => c.name == name).type
    }))
}

function spread(resources) {
  return resources.reduce((acc, part) => [...acc, ...part], [])
}

function reduce(resources) {
  return resources.reduce((acc, { name, amount }) => {
    let component = acc.find(c => c.name == name)
    component ? component.amount += amount : acc.push({ name, amount })
    return acc
  }, [])
}

async function calculateModuleCosts() {
  // Functions to help
  const getResourceObject = resourceName => new Promise(resolve => resolve(Components.find(resource => resource.name == resourceName)))
  const multiply = (resources, multiplier) => new Promise(resolve => resolve(resources.map(({ name, amount }) => ({ name, amount: amount * multiplier }))))

  const getResourceCost = resource => new Promise(async resolve => {
    // Destructure
    let { friendlyReqs } = (typeof resource == "string") ? await getResourceObject(resource) : resource

    // Is a module and not cached
    let moduleCost = await Promise.all(friendlyReqs.map(async ({ name, amount, type }) => type == Enums.ComponentTypes.Module ? await multiply(await getResourceCost(name), amount) : [{ name, amount }]))
    let reduced = reduce(spread(moduleCost))

    resource.cost = reduced

    resolve(reduced)
  })

  Components.filter(({ type }) => type == Enums.ComponentTypes.Module).map(getResourceCost)
}

function UpgradeCalculatorViewController($rootScope) {
  let ctrl = this

  ctrl.resourcesForUpgrade = {}
  ctrl.componentsForUpgrade = {}
  ctrl.products = $rootScope.settings.products
  ctrl.product = ctrl.products[0]
  ctrl.upgradeScale = 1

  ctrl.selectProduct = product => (ctrl.product = product) && (ctrl.calculateFeatureUpgradeCosts())
  ctrl.setUpgradeScale = scale => ctrl.upgradeScale = scale
  ctrl.getFriendlyName = Helpers.GetFriendlyFeatureName
  ctrl.getComponent = componentName => Components.find(component => component.name == componentName)
  ctrl.isUserFeature = featureName => Features.find(feature => feature.name == featureName).categoryName == Enums.FeatureCategories.Users

  ctrl.calculateFeatureUpgradeCosts = () => {
    let productFeatures = $rootScope.settings.featureInstances.filter(feature => feature.productId == ctrl.product.id)
    let upgradeableFeatures = productFeatures.filter(({ featureName }) => ctrl.isUserFeature(featureName))
    log('upgradeable:', upgradeableFeatures)

    let resourcesForUpgrade = reduce(spread(upgradeableFeatures.map(feature => convertToFriendly(feature.requirements))))
    log('resourcesForUpgrade:', resourcesForUpgrade)

    let componentsForUpgrade = reduce(spread(resourcesForUpgrade.map(({ name, amount }) => {
      let component = ctrl.getComponent(name)
      return component.cost ? component.cost : [{ name, amount }]
    })))
    log('componentsForUpgrade:', componentsForUpgrade)

    ctrl.resourcesForUpgrade = resourcesForUpgrade
    ctrl.componentsForUpgrade = componentsForUpgrade
  }

  ctrl.calculateFeatureUpgradeCosts()
}