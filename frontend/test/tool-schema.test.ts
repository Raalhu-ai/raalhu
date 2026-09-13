import { expect, test } from 'bun:test';
import { AGENT_TOOLS as webTools } from '../src/lib/agent/tools';
import { AGENT_TOOLS as sharedTools } from '../../packages/shared/src/agent/tools';

// Google validates every attached declaration, even for a plain greeting.
function findEmptyEnums(value: unknown, path = 'tools'): string[] {
 if (!value || typeof value !== 'object') return [];
 return Object.entries(value).flatMap(([key, child]) => {
  const childPath = `${path}.${key}`;
  if (key === 'enum' && Array.isArray(child)) {
   return child.flatMap((entry, index) => entry === '' ? [`${childPath}[${index}]`] : []);
  }
  return findEmptyEnums(child, childPath);
 });
}

for (const [name, tools] of [['web', webTools], ['shared', sharedTools]] as const) {
 test(`${name}: no tool enum contains an empty string`, () => {
  expect(findEmptyEnums(tools)).toEqual([]);
 });
 test(`${name}: countable recipe ingredients can omit units`, () => {
  const recipe = tools[0].functionDeclarations.find(tool => tool.name === 'recipe_display')!;
  const ingredient = recipe.parameters.properties.ingredients!.items!;
  expect(ingredient.required).not.toContain('unit');
  expect(ingredient.properties!.unit!.description).toContain('Omit');
 });
}
