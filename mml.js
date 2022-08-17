function tokenize(str) {
  const isParen = (c) => {
    const cp = c.codePointAt(0);
    return "(".codePointAt(0) === cp || cp === ")".codePointAt(0);
  };
  const isDigit = (c) => {
    const cp = c.codePointAt(0);
    return "0".codePointAt(0) <= cp && cp <= "9".codePointAt(0);
  };
  const isAlpha = (c) => {
    const cp = c.codePointAt(0);
    return (
      "A".codePointAt(0) <= cp && cp <= "Z".codePointAt(0) ||
      "a".codePointAt(0) <= cp && cp <= "z".codePointAt(0)
    );
  };
  const isSign = (c) => {
    const cp = c.codePointAt(0);
    return (
      "!".codePointAt(0) <= cp && cp <= "/".codePointAt(0) ||
      ":".codePointAt(0) <= cp && cp <= "@".codePointAt(0) ||
      "[".codePointAt(0) <= cp && cp <= "`".codePointAt(0) ||
      "{".codePointAt(0) <= cp && cp <= "~".codePointAt(0)
    );
  };
  let tokens = [];
  for (let i = 0; i < str.length;) {
    if (isParen(str[i])) {
      tokens.push({ type: "Paren", value: str[i] });
      i++;
    } else if (isDigit(str[i])) {
      let e = i + 1;
      while (e < str.length && isDigit(str[e])) ++e;
      tokens.push({ type: "Number", value: Number(str.slice(i, e)) });
      i = e;
    } else if (isSign(str[i]) && !isParen(str[i])) {
      let e = i + 1;
      while (e < str.length && isSign(str[e]) && !isParen(str[e])) ++e;
      tokens.push({ type: "String", value: str.slice(i, e) });
      i = e;
    } else if (isAlpha(str[i])) {
      let e = i + 1;
      while (e < str.length && isAlpha(str[e])) ++e;
      tokens.push({ type: "String", value: str.slice(i, e) });
      i = e;
    } else {
      ++i;
    }
  }
  return tokens;
}

function parseExpr(tokens, i) {
  const r0 = parsePrimary(tokens, i);
  if (r0 === undefined) {
    return undefined;
  }
  i = r0[0];
  let expr = r0[1];
  while (i < tokens.length) {
    const r1 = parsePrimary(tokens, i);
    if (r1 === undefined) {
      break;
    }
    i = r1[0];
    const r2 = parsePrimary(tokens, i);
    let exprR;
    if (r2 !== undefined) {
      i = r2[0];
      exprR = r2[1];
    }
    expr = { type: "Call", name: r1[1], args: [expr, exprR] };
  }
  return [i, expr];
}

function parsePrimary(tokens, i) {
  if (i >= tokens.length) {
    return undefined;
  }
  const token = tokens[i];
  if (token.type === "Paren" && token.value === "(") {
    i++;
    let expr;
    const r = parseExpr(tokens, i);
    if (r === undefined) {
      expr = { type: "Null" };
    } else {
      i = r[0];
      expr = r[1];
    }
    console.assert(tokens[i].type === "Paren" && tokens[i].value === ")");
    i++;
    return [i, expr];
  }
  if (token.type === "Number") {
    i++;
    return [i, { type: "Number", value: token.value }];
  }
  if (token.type === "String") {
    i++;
    return [i, { type: "String", value: token.value }];
  }
  return undefined;
}

function evalExpr(expr) {
  if (expr.type === "Call") {
    const name = evalExpr(expr.name);
    const f = environment[name];
    if (typeof f === "function") {
      return f(expr);
    } else {
      const args = [
        evalExpr(expr.args[0]),
        evalExpr(expr.args[1])
      ];
      const f = environment[name];
      environment["args"] = args;
      return evalExpr(f);
    }
  }
  if (expr.type === "Number") {
    return expr.value;
  }
  if (expr.type === "String") {
    return expr.value;
  }
  if (expr.type === "Null") {
    return undefined;
  }
}

const environment = {};

function addNativeFunctions() {
  environment["+"] = (expr) => {
    return evalExpr(expr.args[0]) + evalExpr(expr.args[1]);
  };
  environment["#"] = (expr) => {
    return evalExpr(expr.args[0]);
  };
  environment[";"] = (expr) => {
    evalExpr(expr.args[0]);
    return evalExpr(expr.args[1]);
  };
  environment["="] = (expr) => {
    const k = evalExpr(expr.args[0]);
    const v = evalExpr(expr.args[1]);
    environment[k] = v;
    return v;
  };
  environment["$"] = (expr) => {
    evalExpr(expr.args[0]);
    return environment[evalExpr(expr.args[1])];
  };
  environment["."] = (expr) => {
    const obj = evalExpr(expr.args[0]);
    const key = evalExpr(expr.args[1]);
    return obj[key];
  };
  environment["=>"] = (expr) => {
    evalExpr(expr.args[0]);
    return expr.args[1];
  };
  environment["-"] = (expr) => {
    return evalExpr(expr.args[0]) - evalExpr(expr.args[1]);
  };
  environment["=="] = (expr) => {
    return evalExpr(expr.args[0]) === evalExpr(expr.args[1]);
  };
  environment["print"] = (expr) => {
    console.log(evalExpr(expr.args[0]), evalExpr(expr.args[1]));
    return undefined;
  };
  environment["and"] = (expr) => {
    if (evalExpr(expr.args[0])) {
      return evalExpr(expr.args[1]);
    }
    return undefined;
  };
  environment["then"] = (expr) => {
    if (evalExpr(expr.args[0])) {
      return evalExpr(expr.args[1]);
    }
    return undefined;
  };
}

addNativeFunctions();

const code = `
  ()print((3 + 10) - (8 + 4 + 2));
  ()print(3);
  ()print(3 == 3);
  0 and (()print(10));
  1 and (()print(11));
  1 then (
    ()print(12)
  );
  a = 5;
  ()print(()$a);
  a = (()$a + 3);
  ()print(()$a);
  fn = (() => (
    ()print(()$args.0);
    ()print(()$args.1)
  ));
  (1)fn(2);
  (3)fn(4)
`;
console.log(code);
tokens = tokenize(code);
console.log(tokens);
console.log(JSON.stringify(parseExpr(tokens, 0)[1], null, 2));
console.log(evalExpr(parseExpr(tokens, 0)[1]));
console.log(environment);
