// Custom babel plugin to transform import.meta.env to process.env for Jest
module.exports = function () {
  return {
    visitor: {
      MemberExpression(path) {
        if (
          path.node.object.type === "MetaProperty" &&
          path.node.object.meta.name === "import" &&
          path.node.object.property.name === "meta" &&
          path.node.property.name === "env"
        ) {
          path.replaceWithSourceString("process.env");
        }
      },
    },
  };
};
