import { SKILLS } from './skills/index';

/**
 * Gemini function declarations for agent mode.
 */
export const AGENT_TOOLS = [
	{
		functionDeclarations: [
			{
				name: 'read_skill',
				description:
					'Load detailed instructions for a specific task (e.g. creating Word docs, PDFs, spreadsheets). ALWAYS call this before attempting an unfamiliar file creation task. Available skills: ' +
					SKILLS.map((s) => s.name).join(', '),
				parameters: {
					type: 'OBJECT',
					properties: {
						name: {
							type: 'STRING',
							description: 'The skill name to load',
							enum: SKILLS.map((s) => s.name)
						}
					},
					required: ['name']
				}
			},
			{
				name: 'execute_python',
				description:
					'Execute Python code in a sandboxed Pyodide environment. Use ONLY for: (1) installing packages via micropip, (2) running .py scripts written with write_file. Do NOT write long inline code — use write_file to create a .py file first, then execute it here. Stdout and stderr are captured and returned.',
				parameters: {
					type: 'OBJECT',
					properties: {
						description: {
							type: 'STRING',
							description: 'Brief human-readable intent of what this code does (e.g. "PDF ރިޕޯޓް ހެދުން")'
						},
						code: {
							type: 'STRING',
							description: 'The Python code to execute'
						}
					},
					required: ['code']
				}
			},
			{
				name: 'write_file',
				description:
					'Write any file to the virtual filesystem. Use for ALL file creation: text files, Python scripts (.py), HTML, CSV, etc. For binary file generation (DOCX, PDF, XLSX, PNG), write the Python script as a .py file here, then run it with execute_python. Use /output/ for user-facing files, /workspace/ for scripts and temporary files.',
				parameters: {
					type: 'OBJECT',
					properties: {
						description: {
							type: 'STRING',
							description: 'Brief human-readable intent (e.g. "HTML ޕޭޖް ލިޔުން")'
						},
						path: {
							type: 'STRING',
							description: 'The file path (e.g. /output/result.txt)'
						},
						content: {
							type: 'STRING',
							description: 'The text content to write'
						}
					},
					required: ['path', 'content']
				}
			},
			{
				name: 'read_file',
				description: 'Read a text file from the virtual filesystem.',
				parameters: {
					type: 'OBJECT',
					properties: {
						description: {
							type: 'STRING',
							description: 'Brief human-readable intent (e.g. "CSV ޑޭޓާ ކިޔުން")'
						},
						path: {
							type: 'STRING',
							description: 'The file path to read'
						}
					},
					required: ['path']
				}
			},
			{
				name: 'list_directory',
				description: 'List files and directories in a path on the virtual filesystem.',
				parameters: {
					type: 'OBJECT',
					properties: {
						path: {
							type: 'STRING',
							description: 'The directory path to list (e.g. /output/)'
						}
					},
					required: ['path']
				}
			},
			{
				name: 'present_file',
				description:
					'Present a file from the virtual filesystem to the user as a downloadable artifact. Call this after creating any file the user should be able to download.',
				parameters: {
					type: 'OBJECT',
					properties: {
						path: {
							type: 'STRING',
							description: 'The file path to present (e.g. /output/document.docx)'
						},
						label: {
							type: 'STRING',
							description: 'A short human-readable label for the file (in Thaana if possible)'
						}
					},
					required: ['path', 'label']
				}
			},
			{
				name: 'message_compose',
				description:
					'Draft a message (email, Slack, or text) with goal-oriented approaches. Analyze the situation and generate 2-3 strategy variants that lead to different outcomes. For high-stakes or ambiguous situations, provide multiple approaches with clear labels and trade-offs. For simple/transactional messages, a single variant is fine. For emails, include a subject line in each variant.',
				parameters: {
					type: 'OBJECT',
					properties: {
						kind: {
							type: 'STRING',
							description: 'Type of message',
							enum: ['email', 'textMessage', 'other']
						},
						summary_title: {
							type: 'STRING',
							description: 'Brief title summarizing the message purpose'
						},
						variants: {
							type: 'ARRAY',
							description: 'Array of 1-3 message variants with different approaches',
							items: {
								type: 'OBJECT',
								properties: {
									label: {
										type: 'STRING',
										description: '2-4 word goal-oriented label (e.g. "Polite decline", "Hold firm", "Apologetic")'
									},
									body: {
										type: 'STRING',
										description: 'The message content'
									},
									subject: {
										type: 'STRING',
										description: 'Email subject line (only for email kind)'
									}
								},
								required: ['label', 'body']
							}
						}
					},
					required: ['kind', 'summary_title', 'variants']
				}
			},
			{
				name: 'recipe_display',
				description:
					'Display a structured recipe with ingredients, steps, and optional timers. Use when the user asks for a recipe, cooking instructions, or food preparation guide. The recipe renders as an interactive card with adjustable servings that scales all ingredient amounts proportionally.',
				parameters: {
					type: 'OBJECT',
					properties: {
						title: {
							type: 'STRING',
							description: 'Recipe name (in Thaana if the conversation is in Dhivehi)'
						},
						description: {
							type: 'STRING',
							description: 'Brief description or tagline for the recipe'
						},
						ingredients: {
							type: 'ARRAY',
							description: 'List of ingredients',
							items: {
								type: 'OBJECT',
								properties: {
									id: {
										type: 'STRING',
										description: 'Unique ID for referencing in steps, 4 chars e.g. "0001"'
									},
									name: {
										type: 'STRING',
										description: 'Ingredient display name'
									},
									amount: {
										type: 'NUMBER',
										description: 'Quantity for base_servings'
									},
									unit: {
										type: 'STRING',
										description: 'Unit of measurement. Use "" for countable items (e.g. 3 eggs)',
										enum: ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl_oz', 'pinch', 'piece', '']
									}
								},
								required: ['id', 'name', 'amount']
							}
						},
						steps: {
							type: 'ARRAY',
							description: 'Ordered cooking steps',
							items: {
								type: 'OBJECT',
								properties: {
									id: {
										type: 'STRING',
										description: 'Unique step ID'
									},
									title: {
										type: 'STRING',
										description: 'Short step summary, used as header'
									},
									content: {
										type: 'STRING',
										description: 'Full instruction text. Use {ingredient_id} to insert ingredient amounts inline'
									},
									timer_seconds: {
										type: 'NUMBER',
										description: 'Timer duration in seconds. Include for any waiting/cooking/baking/resting step'
									}
								},
								required: ['id', 'title', 'content']
							}
						},
						base_servings: {
							type: 'NUMBER',
							description: 'Number of servings at base amounts (default 4)'
						},
						notes: {
							type: 'STRING',
							description: 'Tips, variations, or additional notes'
						}
					},
					required: ['title', 'ingredients', 'steps']
				}
			},
			{
				name: 'web_fetch',
				description:
					'Fetch and process content from a URL. The prompt should contain the URL(s) and instructions for what to extract or summarize. Use this to read web pages, documentation, articles, or any online content.',
				parameters: {
					type: 'OBJECT',
					properties: {
						prompt: {
							type: 'STRING',
							description:
								'A prompt containing the URL(s) to fetch and instructions for processing (e.g. "Summarize the article at https://example.com/article")'
						}
					},
					required: ['prompt']
				}
			},
			{
				name: 'web_search',
				description:
					'Search the web using Google Search for current information, news, facts, or any topic. Returns search results with source citations. Use this when the user asks about recent events, needs factual information, or when you need to look something up.',
				parameters: {
					type: 'OBJECT',
					properties: {
						query: {
							type: 'STRING',
							description: 'The search query (in English for best results)'
						}
					},
					required: ['query']
				}
			},
			{
				name: 'ask_user_input',
				description:
					'Present clickable options to the user. Use this instead of asking questions in prose when the question has 2-4 bounded choices. Always include a brief message before calling this tool. Use when: clarification is needed, user asks "which should I...", recommendation needs narrowing, or ranking would help. Skip when: question is open-ended, context makes choice obvious, or user asked to discuss in prose.',
				parameters: {
					type: 'OBJECT',
					properties: {
						questions: {
							type: 'ARRAY',
							description: 'Array of 1-3 questions to present',
							items: {
								type: 'OBJECT',
								properties: {
									question: {
										type: 'STRING',
										description: 'The question text shown to the user (in Thaana)'
									},
									options: {
										type: 'ARRAY',
										description: 'Array of 2-4 short option labels (in Thaana if possible)',
										items: { type: 'STRING' }
									},
									type: {
										type: 'STRING',
										description: 'Selection type: single_select (choose 1) or multi_select (choose 1+)',
										enum: ['single_select', 'multi_select']
									}
								},
								required: ['question', 'options']
							}
						}
					},
					required: ['questions']
				}
			}
		]
	}
];
