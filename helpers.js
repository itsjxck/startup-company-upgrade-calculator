const convertToFriendly = async resources =>
  Object.keys(resources).map(name => ({
    name,
    amount: resources[name],
    type: Components.find(c => c.name === name).type
  }));

const spread = async resources =>
  (await Promise.all(resources)).reduce((acc, part) => [...acc, ...part], []);

const reduce = async resources =>
  (await resources).reduce((acc, { name, amount }) => {
    let component = acc.find(c => c.name === name);
    component ? (component.amount += amount) : acc.push({ name, amount });
    return acc;
  }, []);

const multiply = async (resources, multiplier) =>
  (await resources).map(({ name, amount }) => ({
    name,
    amount: amount * multiplier
  }));

const getResourceObject = async resourceName =>
  Components.find(resource => resource.name === resourceName);

const getResourceCost = async _resource => {
  const resource =
    typeof _resource === "string"
      ? await getResourceObject(_resource)
      : _resource;

  if (resource.cost === undefined) {
    const moduleCost = resource.friendlyReqs.map(({ name, amount, type }) =>
      type === Enums.ComponentTypes.Module
        ? multiply(getResourceCost(name), amount)
        : [{ name, amount }]
    );

    resource.cost = await reduce(spread(moduleCost));
  }

  return resource.cost;
};

module.exports = {
  convertToFriendly,
  spread,
  reduce,
  multiply,
  getResourceObject,
  getResourceCost
};
