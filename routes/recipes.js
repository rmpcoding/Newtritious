const passport = require('passport');
const { User, Recipe } = require('../models');
require('../services/passport');

module.exports = function (app) {
  /* ----------------------------- GET ALL RECIPES ---------------------------- */
  app.get(
    '/',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        const user = await User.findOne({
          _id: req.user._id
        });

        const recipes = await Recipe.find()
          .where('_id')
          .in(user.savedRecipes)
          .select('-__v');

        if (!recipes.length) {
          return res.status(404).json({
            message: 'No saved recipes. Try saving a recipe first!'
          });
        }

        res.status(200).json(recipes);
      } catch (e) {
        res.status(500).send(`Error: ${e.message}`);
      }
    }
  );

  /* ---------------------------- GET SINGLE RECIPE --------------------------- */
  app.get(
    '/:id',
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
      const spoonacularRecipeId = Number(req.params.id);
      const userId = req.user._id;

      try {
        const user = await User.findOne({
          _id: userId
        });

        let recipe = await Recipe.findOne({ id: spoonacularRecipeId }).select(
          '-__v'
        );

        const savedRecipes = user.savedRecipes;

        let hasRecipe = savedRecipes.find(
          (element) => element.toString() === recipe._id.toString()
        );

        if (!hasRecipe) {
          return res.status(404).send(`Recipe not found`);
        }

        res.status(200).json(recipe);
      } catch (e) {
        res.status(500).send(`Error: ${e.message}`);
      }
    }
  );

  /* ------------------------------ SAVE A RECIPE ----------------------------- */
  app.post(
    '/',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      const spoonacularRecipeId = req.body.id;

      try {
        const user = await User.findOne({
          _id: req.user._id
        });

        let recipe = await Recipe.findOne({ id: spoonacularRecipeId }).select(
          '-__v'
        );

        // Database _ids are saved as objects, not strings, so string conversion must occur to compare.
        let isRecipeSavedToUser = user.savedRecipes.find(
          (element) => element.toString() === recipe._id.toString()
        );

        if (isRecipeSavedToUser) {
          return res.status(400).json({
            error: 'Recipe is already saved to database.'
          });
        }

        user.savedRecipes.addToSet(recipe);

        await user.save();
        res.status(201).json(recipe);
      } catch (e) {
        res.status(500).json(e.message);
      }
    }
  );

  /* ------------------------------ DELETE RECIPE ----------------------------- */
  app.delete(
    '/:id',
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
      const spoonacularRecipeId = Number(req.params.id);
      const userId = req.user._id;
      try {
        const user = await User.findOne({
          _id: userId
        });

        const recipe = await Recipe.findOne({
          id: spoonacularRecipeId
        });

        if (!recipe) {
          return res.status(404).json({
            error: 'Recipe has not been saved to database.'
          });
        }

        let isRecipeSavedToUser = user.savedRecipes.find(
          (savedRecipe) => savedRecipe.toString() === recipe._id.toString()
        );

        if (!isRecipeSavedToUser) {
          return res.status(404).json({
            error: 'Recipe has not been saved to favorites.'
          });
        }

        user.savedRecipes = user.savedRecipes.filter(
          (savedRecipe) => savedRecipe.toString() !== recipe._id.toString()
        );

        await user.save();

        res.status(200).json({ message: "Recipe deleted from user's favorited recipes" });
      } catch (e) {
        res.status(500).json(e.message);
      }
    }
  );
};
