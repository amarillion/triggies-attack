// Generated with DeepSeek.

import { Tokenizer, TokenType, Token } from './tokenizer';

// AST Node Types
export enum NodeType {
	Program = 'Program',
	Assignment = 'Assignment',
	BinaryExpression = 'BinaryExpression',
	UnaryExpression = 'UnaryExpression',
	FunctionCall = 'FunctionCall',
	NumberLiteral = 'NumberLiteral',
	Identifier = 'Identifier',
}

export interface ASTNode {
	type: NodeType,
}

export interface ProgramNode extends ASTNode {
	type: NodeType.Program,
	statements: ASTNode[],
}

export interface AssignmentNode extends ASTNode {
	type: NodeType.Assignment,
	identifier: string,
	value: ExpressionNode,
}

export interface BinaryExpressionNode extends ASTNode {
	type: NodeType.BinaryExpression,
	operator: TokenType,
	left: ExpressionNode,
	right: ExpressionNode,
}

export interface UnaryExpressionNode extends ASTNode {
	type: NodeType.UnaryExpression,
	operator: TokenType,
	argument: ExpressionNode,
}

export interface FunctionCallNode extends ASTNode {
	type: NodeType.FunctionCall,
	name: string,
	arguments: ExpressionNode[],
}

export interface NumberLiteralNode extends ASTNode {
	type: NodeType.NumberLiteral,
	value: number,
}

export interface IdentifierNode extends ASTNode {
	type: NodeType.Identifier,
	name: string,
}

export type ExpressionNode =
	| BinaryExpressionNode
	| UnaryExpressionNode
	| FunctionCallNode
	| NumberLiteralNode
	| IdentifierNode;

// Parser
export class Parser {
	private tokens: Token[];
	private position: number;
	private currentToken: Token;
	
	constructor(input: string) {
		const tokenizer = new Tokenizer(input);
		this.tokens = tokenizer.getAllTokens();
		this.position = 0;
		this.currentToken = this.tokens[0];
	}
	
	private eat(tokenType: TokenType): Token {
		if (this.currentToken.type === tokenType) {
			const token = this.currentToken;
			this.position++;
			this.currentToken = this.tokens[this.position];
			return token;
		}
		throw new Error(`Expected token ${tokenType}, got ${this.currentToken.type} at line ${this.currentToken.line}, column ${this.currentToken.column}`);
	}
	
	private peek(): TokenType {
		return this.currentToken.type;
	}
	
	// Grammar:
	// program = statement*
	// statement = assignment | expression LINE_END?
	// assignment = IDENTIFIER ASSIGN expression
	// expression = logical (actually just arithmetic for now)
	// arithmetic = term ( (PLUS | MINUS) term )*
	// term = factor ( (MULTIPLY | DIVIDE) factor )*
	// factor = NUMBER | IDENTIFIER | function_call | LPAREN expression RPAREN | (PLUS | MINUS) factor
	// function_call = IDENTIFIER LPAREN (expression (COMMA expression)*)? RPAREN
	
	public parse(): ProgramNode {
		const statements: ASTNode[] = [];
		
		while (this.peek() !== TokenType.EOF) {
			const statement = this.parseStatement();
			statements.push(statement);
			
			// Consume LINE_END if present (optional)
			if (this.peek() === TokenType.LINE_END) {
				this.eat(TokenType.LINE_END);
			}
		}
		
		return {
			type: NodeType.Program,
			statements,
		};
	}
	
	private parseStatement(): ASTNode {
		// Check if it's an assignment (IDENTIFIER followed by ASSIGN)
		if (this.peek() === TokenType.IDENTIFIER) {
			const nextTokenPos = this.position + 1;
			if (nextTokenPos < this.tokens.length && this.tokens[nextTokenPos].type === TokenType.ASSIGN) {
				return this.parseAssignment();
			}
		}
		
		// Otherwise it's just an expression statement
		return this.parseExpression();
	}
	
	private parseAssignment(): AssignmentNode {
		const identifierToken = this.eat(TokenType.IDENTIFIER);
		this.eat(TokenType.ASSIGN);
		const value = this.parseExpression();
		
		return {
			type: NodeType.Assignment,
			identifier: identifierToken.value as string,
			value,
		};
	}
	
	private parseExpression(): ExpressionNode {
		return this.parseArithmetic();
	}
	
	private parseArithmetic(): ExpressionNode {
		let node = this.parseTerm();
		
		while (this.peek() === TokenType.PLUS || this.peek() === TokenType.MINUS) {
			const operator = this.currentToken.type;
			this.eat(operator);
			const right = this.parseTerm();
			
			node = {
				type: NodeType.BinaryExpression,
				operator,
				left: node,
				right,
			};
		}
		
		return node;
	}
	
	private parseTerm(): ExpressionNode {
		let node = this.parseFactor();
		
		while (this.peek() === TokenType.MULTIPLY || this.peek() === TokenType.DIVIDE) {
			const operator = this.currentToken.type;
			this.eat(operator);
			const right = this.parseFactor();
			
			node = {
				type: NodeType.BinaryExpression,
				operator,
				left: node,
				right,
			};
		}
		
		return node;
	}
	
	private parseFactor(): ExpressionNode {
		const token = this.currentToken;
		
		// Handle unary plus/minus
		if (token.type === TokenType.PLUS || token.type === TokenType.MINUS) {
			this.eat(token.type);
			const argument = this.parseFactor();
			return {
				type: NodeType.UnaryExpression,
				operator: token.type,
				argument,
			};
		}
		
		// Handle numbers
		if (token.type === TokenType.NUMBER) {
			this.eat(TokenType.NUMBER);
			return {
				type: NodeType.NumberLiteral,
				value: token.value as number,
			};
		}
		
		// Handle identifiers (could be variable or function call)
		if (token.type === TokenType.IDENTIFIER) {
			// Check if it's a function call
			if (this.peekNext() === TokenType.LPAREN) {
				return this.parseFunctionCall();
			}
			
			// Otherwise it's a variable
			this.eat(TokenType.IDENTIFIER);
			return {
				type: NodeType.Identifier,
				name: token.value as string,
			};
		}
		
		// Handle parenthesized expressions
		if (token.type === TokenType.LPAREN) {
			this.eat(TokenType.LPAREN);
			const expr = this.parseExpression();
			this.eat(TokenType.RPAREN);
			return expr;
		}
		
		throw new Error(`Unexpected token ${token.type} at line ${token.line}, column ${token.column}`);
	}
	
	private parseFunctionCall(): FunctionCallNode {
		const nameToken = this.eat(TokenType.IDENTIFIER);
		this.eat(TokenType.LPAREN);
		
		const args: ExpressionNode[] = [];
		
		// Parse arguments if any
		if (this.peek() !== TokenType.RPAREN) {
			do {
				args.push(this.parseExpression());
			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
			} while (this.peek() === TokenType.COMMA && this.eat(TokenType.COMMA));
		}
		
		this.eat(TokenType.RPAREN);
		
		return {
			type: NodeType.FunctionCall,
			name: nameToken.value as string,
			arguments: args,
		};
	}
	
	private peekNext(): TokenType {
		if (this.position + 1 < this.tokens.length) {
			return this.tokens[this.position + 1].type;
		}
		return TokenType.EOF;
	}
}

// Evaluator
export class Evaluator {
	private variables: Map<string, number> = new Map();
	private functions: Map<string, (args: number[]) => number> = new Map();
	
	constructor() {
		// Register built-in functions
		this.registerFunction('sin', (args: number[]) => Math.sin(args[0]));
		this.registerFunction('cos', (args: number[]) => Math.cos(args[0]));
		this.registerFunction('tan', (args: number[]) => Math.tan(args[0]));
		this.registerFunction('sqrt', (args: number[]) => Math.sqrt(args[0]));
		this.registerFunction('pow', (args: number[]) => Math.pow(args[0], args[1]));
		this.registerFunction('abs', (args: number[]) => Math.abs(args[0]));
		this.registerFunction('max', (args: number[]) => Math.max(...args));
		this.registerFunction('min', (args: number[]) => Math.min(...args));
		this.registerFunction('floor', (args: number[]) => Math.floor(args[0]));
		this.registerFunction('ceil', (args: number[]) => Math.ceil(args[0]));
		this.registerFunction('lerp', (args: number[]) => args[0] + args[2] * (args[1] - args[0]));
		this.registerFunction('frac', (args: number[]) => args[0] - Math.floor(args[0]));
		this.registerFunction('sign', (args: number[]) => Math.sign(args[0]));
	}
	
	public registerFunction(name: string, fn: (args: number[]) => number): void {
		this.functions.set(name, fn);
	}
	
	public setVariable(name: string, value: number): void {
		this.variables.set(name, value);
	}
	
	public getVariable(name: string): number {
		const value = this.variables.get(name);
		if (value === undefined) {
			throw new Error(`Undefined variable: ${name}`);
		}
		return value;
	}
	
	public evaluate(node: ASTNode): number {
		switch (node.type) {
			case NodeType.Program:
				return this.evaluateProgram(node as ProgramNode);
			
			case NodeType.Assignment:
				return this.evaluateAssignment(node as AssignmentNode);
			
			case NodeType.BinaryExpression:
				return this.evaluateBinaryExpression(node as BinaryExpressionNode);
			
			case NodeType.UnaryExpression:
				return this.evaluateUnaryExpression(node as UnaryExpressionNode);
			
			case NodeType.FunctionCall:
				return this.evaluateFunctionCall(node as FunctionCallNode);
			
			case NodeType.NumberLiteral:
				return (node as NumberLiteralNode).value;
			
			case NodeType.Identifier:
				return this.getVariable((node as IdentifierNode).name);
		}
	}
	
	private evaluateProgram(program: ProgramNode): number {
		let lastResult = 0;
		for (const statement of program.statements) {
			lastResult = this.evaluate(statement);
		}
		return lastResult;
	}
	
	private evaluateAssignment(assignment: AssignmentNode): number {
		const value = this.evaluate(assignment.value);
		this.variables.set(assignment.identifier, value);
		return value;
	}
	
	private evaluateBinaryExpression(expr: BinaryExpressionNode): number {
		const left = this.evaluate(expr.left);
		const right = this.evaluate(expr.right);
		
		switch (expr.operator) {
			case TokenType.PLUS:
				return left + right;
			case TokenType.MINUS:
				return left - right;
			case TokenType.MULTIPLY:
				return left * right;
			case TokenType.DIVIDE:
				if (right === 0) {
					return NaN;
				}
				return left / right;
			default:
				throw new Error(`Unknown operator: ${expr.operator}`);
		}
	}
	
	private evaluateUnaryExpression(expr: UnaryExpressionNode): number {
		const arg = this.evaluate(expr.argument);
		
		switch (expr.operator) {
			case TokenType.PLUS:
				return +arg;
			case TokenType.MINUS:
				return -arg;
			default:
				throw new Error(`Unknown unary operator: ${expr.operator}`);
		}
	}
	
	private evaluateFunctionCall(call: FunctionCallNode): number {
		const fn = this.functions.get(call.name);
		if (!fn) {
			throw new Error(`Unknown function: ${call.name}`);
		}
		
		const args = call.arguments.map(arg => this.evaluate(arg));
		return fn(args);
	}
}

// Convenience function to parse and evaluate
export function evaluateScript(ast: ASTNode, variables: Record<string, number> = {}): Record<string, number> {
	const evaluator = new Evaluator();
	
	// Set input variables
	for (const [ name, value ] of Object.entries(variables)) {
		evaluator.setVariable(name, value);
	}
	
	evaluator.evaluate(ast);
	
	// Extract all variables that were assigned or used
	const result: Record<string, number> = {};
	const allVars = [ 'x', 'y' ];
	
	for (const varName of allVars) {
		try {
			const value = evaluator.getVariable(varName);
			result[varName] = value;
		} catch {
			// Variable not defined, skip
		}
	}
	
	return result;
}

// Convenience function to parse and evaluate
export function evaluateExpression(ast: ASTNode, variables: Record<string, number> = {}): number {
	const evaluator = new Evaluator();
	
	// Set input variables
	for (const [ name, value ] of Object.entries(variables)) {
		evaluator.setVariable(name, value);
	}
	
	return evaluator.evaluate(ast);
}
