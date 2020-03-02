const { version } = require("./mod");
const {
  convertToFriendly,
  spread,
  reduce,
  getResourceCost
} = require("./helpers");

const modName = "uc";
const modDisplayName = "Upgrade Calculator";

const log = (...message) =>
  console.log(`[${modDisplayName} ${version}]:`, ...message);

exports.initialize = modPath => {
  Modding.setMenuItem({
    name: modName,
    tooltip: modDisplayName,
    tooltipPosition: "top",
    faIcon: "fa-calculator",
    badgeCount: 0
  });

  // Define custom view
  exports.views = [
    {
      name: modName,
      viewPath: modPath + "calculator.html",
      controller: UpgradeCalculatorViewController
    }
  ];
};

exports.onLoadGame = async () => {
  await Promise.all(
    Components.filter(({ type }) => type === Enums.ComponentTypes.Module).map(
      async module => {
        module.friendlyReqs = await convertToFriendly(module.requirements);
        getResourceCost(module);
      }
    )
  );
};

function UpgradeCalculatorViewController($rootScope) {
  let ctrl = this;

  ctrl.resourcesForUpgrade = {};
  ctrl.componentsForUpgrade = {};
  ctrl.products = $rootScope.settings.products;
  ctrl.product = ctrl.products[0];
  ctrl.upgradeScale = 1;

  ctrl.selectProduct = product =>
    (ctrl.product = product) && ctrl.calculateFeatureUpgradeCosts();

  ctrl.setUpgradeScale = scale => (ctrl.upgradeScale = scale);

  ctrl.getFriendlyName = Helpers.GetFriendlyFeatureName;

  ctrl.getComponent = componentName =>
    Components.find(component => component.name === componentName);

  ctrl.isUserFeature = featureName =>
    Features.find(feature => feature.name === featureName).categoryName ===
    Enums.FeatureCategories.Users;

  ctrl.calculateFeatureUpgradeCosts = async () => {
    const upgradeableFeatures = $rootScope.settings.featureInstances
      .filter(
        feature =>
          feature.productId === ctrl.product.id &&
          ctrl.isUserFeature(feature.featureName)
      )
      .map(feature => convertToFriendly(feature.requirements));

    const resourcesForUpgrade = await reduce(spread(upgradeableFeatures));

    const componentsForUpgrade = await reduce(
      spread(
        resourcesForUpgrade.map(
          ({ name, amount }) =>
            ctrl.getComponent(name).cost || [{ name, amount }]
        )
      )
    );

    ctrl.resourcesForUpgrade = resourcesForUpgrade;
    ctrl.componentsForUpgrade = componentsForUpgrade;
  };

  ctrl.calculateFeatureUpgradeCosts();
}
