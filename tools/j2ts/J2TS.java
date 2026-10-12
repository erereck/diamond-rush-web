import com.sun.source.util.JavacTask;
import com.sun.tools.javac.code.*;
import com.sun.tools.javac.tree.JCTree;
import com.sun.tools.javac.tree.JCTree.*;
import com.sun.tools.javac.tree.TreeInfo;
import com.sun.tools.javac.util.List;
import javax.lang.model.type.TypeKind;
import javax.tools.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/**
 * Translates the decompiled S700 Java sources into TypeScript with Java
 * integer semantics (int32 wrap, byte/short narrowing, long as BigInt), using javac's
 * attributed trees for types. Usage: java J2TS <out-dir> <classpath> <source.java>...
 */
public class J2TS {
  static StringBuilder out;
  static int indent;
  static String currentClass;
  static Set<String> overloaded=new HashSet<>();

  public static void main(String[] args) throws Exception {
    Path outDir=Paths.get(args[0]);Files.createDirectories(outDir);
    String cp=args[1];
    JavaCompiler jc=ToolProvider.getSystemJavaCompiler();
    StandardJavaFileManager fm=jc.getStandardFileManager(null,null,StandardCharsets.ISO_8859_1);
    java.util.List<File> files=new ArrayList<>();for(int i=2;i<args.length;i++)files.add(new File(args[i]));
    JavacTask task=(JavacTask)jc.getTask(null,fm,null,java.util.List.of("-proc:none","-cp",cp,"-encoding","ISO-8859-1","-nowarn"),null,fm.getJavaFileObjectsFromFiles(files));
    Iterable<? extends com.sun.source.tree.CompilationUnitTree> units=task.parse();
    task.analyze();
    for(com.sun.source.tree.CompilationUnitTree u:units)for(JCTree def:((JCCompilationUnit)u).defs)if(def instanceof JCClassDecl)collectOverloads((JCClassDecl)def);
    for(com.sun.source.tree.CompilationUnitTree u:units){
      for(JCTree def:((JCCompilationUnit)u).defs){
        if(!(def instanceof JCClassDecl))continue;
        JCClassDecl cls=(JCClassDecl)def;
        out=new StringBuilder();indent=0;
        emitClass(cls);
        Files.writeString(outDir.resolve(cls.name.toString()+".ts"),out.toString(),StandardCharsets.UTF_8);
      }
    }
  }
  // ---------------------------------------------------------------- helpers
  static void line(String s){for(int i=0;i<indent;i++)out.append("  ");out.append(s).append('\n');}
  static boolean isLong(Type t){return t!=null&&t.getKind()==TypeKind.LONG;}
  static boolean isIntLike(Type t){if(t==null)return false;TypeKind k=t.getKind();return k==TypeKind.INT||k==TypeKind.SHORT||k==TypeKind.BYTE||k==TypeKind.CHAR;}
  static boolean isBool(Type t){return t!=null&&t.getKind()==TypeKind.BOOLEAN;}
  static boolean isFloat(Type t){return t!=null&&(t.getKind()==TypeKind.FLOAT||t.getKind()==TypeKind.DOUBLE);}
  static boolean isString(Type t){return t!=null&&t.toString().equals("java.lang.String");}
  static boolean isChar(Type t){return t!=null&&t.getKind()==TypeKind.CHAR;}
  static Type type(JCTree t){return t.type;}
  static String narrow(Type t,String e){
    if(t==null)return e;
    switch(t.getKind()){
      case BYTE:return "(("+e+")<<24>>24)";
      case SHORT:return "(("+e+")<<16>>16)";
      case CHAR:return "(("+e+")&65535)";
      case INT:return "(("+e+")|0)";
      case LONG:return "BigInt.asIntN(64,"+e+")";
      default:return e;
    }
  }
  static String toLong(JCExpression e){String s=expr(e);return isLong(type(e))?s:"BigInt("+s+")";}
  static String toNumber(JCExpression e){String s=expr(e);return isLong(type(e))?"Number(BigInt.asIntN(32,"+s+"))":s;}
  static String mangle(Symbol.MethodSymbol m){
    String owner=m.owner.name.toString(),name=m.name.toString();
    if(overloaded.contains(owner+"."+name)){
      StringBuilder b=new StringBuilder(name).append('$');
      for(Symbol.VarSymbol p:m.params)b.append(p.type.toString().replaceAll("[^A-Za-z0-9]","_"));
      return b.toString();
    }
    return name;
  }
  static String arrayCtor(Type comp){
    switch(comp.getKind()){
      case BYTE:return "Int8Array";case SHORT:return "Int16Array";case CHAR:return "Uint16Array";case INT:return "Int32Array";
      case LONG:return "BigInt64Array";case FLOAT:return "Float32Array";case DOUBLE:return "Float64Array";default:return null;
    }
  }
  static String defaultValue(Type t){
    if(t.isPrimitive()){if(isBool(t))return "false";if(isLong(t))return "0n";return "0";}
    return "null";
  }
  static String jsName(String n){
    switch(n){case "arguments":case "eval":case "function":case "delete":case "in":case "let":case "var":case "with":case "typeof":case "yield":case "await":case "export":case "debugger":return n+"_";default:return n;}
  }
  // ---------------------------------------------------------------- classes
  static void collectOverloads(JCClassDecl cls){
    Map<String,Integer> counts=new HashMap<>();
    for(JCTree d:cls.defs)if(d instanceof JCMethodDecl){JCMethodDecl m=(JCMethodDecl)d;if(!m.name.toString().equals("<init>"))counts.merge(m.name.toString(),1,Integer::sum);}
    for(Map.Entry<String,Integer> e:counts.entrySet())if(e.getValue()>1)overloaded.add(cls.name.toString()+"."+e.getKey());
  }
  static void emitClass(JCClassDecl cls){
    currentClass=cls.name.toString();
    String ext=cls.extending!=null?" extends "+cls.extending.type.tsym.name:"";
    line("// Generated from "+currentClass+".java by J2TS");
    line("export class "+currentClass+ext+" {");indent++;
    java.util.List<JCMethodDecl> ctors=new ArrayList<>();
    for(JCTree d:cls.defs){
      if(d instanceof JCVariableDecl){
        JCVariableDecl v=(JCVariableDecl)d;boolean st=(v.sym.flags()&Flags.STATIC)!=0;
        String init=v.init!=null?initExpr(v.init,v.type):defaultValue(v.type);
        line((st?"static ":"")+jsName(v.name.toString())+":any = "+init+";");
      }
    }
    for(JCTree d:cls.defs){
      if(d instanceof JCBlock){JCBlock b=(JCBlock)d;if((b.flags&Flags.STATIC)!=0){line("static {");indent++;for(JCStatement s:b.stats)stmt(s);indent--;line("}");}}
      if(d instanceof JCMethodDecl){
        JCMethodDecl m=(JCMethodDecl)d;
        if(m.name.toString().equals("<init>")){ctors.add(m);continue;}
        if(m.body==null)continue;
        boolean st=(m.mods.flags&Flags.STATIC)!=0;
        StringBuilder ps=new StringBuilder();for(JCVariableDecl p:m.params){if(ps.length()>0)ps.append(',');ps.append(jsName(p.name.toString())).append(":any");}
        line((st?"static ":"")+mangle(m.sym)+"("+ps+"):any {");indent++;
        for(JCStatement s:m.body.stats)stmt(s);
        indent--;line("}");
      }
    }
    if(!ctors.isEmpty()){
      line("constructor(...a:any[]) {");indent++;
      boolean superDone=false;
      for(JCMethodDecl c:ctors){
        line("if(a.length==="+c.params.size()+") {");indent++;
        int i=0;for(JCVariableDecl p:c.params)line("var "+jsName(p.name.toString())+" = a["+(i++)+"];");
        for(JCStatement s:c.body.stats){
          if(s instanceof JCExpressionStatement&&((JCExpressionStatement)s).expr instanceof JCMethodInvocation){
            JCMethodInvocation inv=(JCMethodInvocation)((JCExpressionStatement)s).expr;
            String n=TreeInfo.name(inv.meth).toString();
            if(n.equals("super")){StringBuilder as=new StringBuilder();for(JCExpression x:inv.args){if(as.length()>0)as.append(',');as.append(expr(x));}
              if(cls.extending!=null){line("super("+as+");");superDone=true;}continue;}
          }
          stmt(s);
        }
        line("return;");
        indent--;line("}");
      }
      indent--;line("}");
      if(cls.extending!=null&&!superDone){/* default super() inserted by TS if needed */}
    }
    indent--;line("}");
  }
  static String initExpr(JCExpression init,Type t){return expr(init);}
  // ---------------------------------------------------------------- statements
  static void stmt(JCStatement s){
    if(s instanceof JCBlock){line("{");indent++;for(JCStatement x:((JCBlock)s).stats)stmt(x);indent--;line("}");return;}
    if(s instanceof JCVariableDecl){
      JCVariableDecl v=(JCVariableDecl)s;
      line("var "+jsName(v.name.toString())+(v.init!=null?" = "+expr(v.init):"")+";");return;
    }
    if(s instanceof JCExpressionStatement){line(exprStmt(((JCExpressionStatement)s).expr)+";");return;}
    if(s instanceof JCIf){
      JCIf f=(JCIf)s;line("if ("+cond(f.cond)+") {");indent++;body(f.thenpart);indent--;
      if(f.elsepart!=null){line("} else {");indent++;body(f.elsepart);indent--;}
      line("}");return;
    }
    if(s instanceof JCWhileLoop){JCWhileLoop w=(JCWhileLoop)s;line("while ("+cond(w.cond)+") {");indent++;body(w.body);indent--;line("}");return;}
    if(s instanceof JCDoWhileLoop){JCDoWhileLoop w=(JCDoWhileLoop)s;line("do {");indent++;body(w.body);indent--;line("} while ("+cond(w.cond)+");");return;}
    if(s instanceof JCForLoop){
      JCForLoop f=(JCForLoop)s;
      StringBuilder init=new StringBuilder();
      for(JCStatement i:f.init){
        if(i instanceof JCVariableDecl){JCVariableDecl v=(JCVariableDecl)i;init.append(init.length()==0?"var ":", ").append(jsName(v.name.toString())).append(v.init!=null?" = "+expr(v.init):"");}
        else{if(init.length()>0)init.append(", ");init.append(exprStmt(((JCExpressionStatement)i).expr));}
      }
      StringBuilder step=new StringBuilder();for(JCExpressionStatement e:f.step){if(step.length()>0)step.append(", ");step.append(exprStmt(e.expr));}
      line("for ("+init+"; "+(f.cond!=null?cond(f.cond):"")+"; "+step+") {");indent++;body(f.body);indent--;line("}");return;
    }
    if(s instanceof JCEnhancedForLoop){JCEnhancedForLoop f=(JCEnhancedForLoop)s;line("for (var "+jsName(f.var.name.toString())+" of "+expr(f.expr)+") {");indent++;body(f.body);indent--;line("}");return;}
    if(s instanceof JCLabeledStatement){JCLabeledStatement l=(JCLabeledStatement)s;line(l.label+":");stmt(l.body);return;}
    if(s instanceof JCSwitch){
      JCSwitch sw=(JCSwitch)s;
      line("switch ("+switchSelector(sw.selector)+") {");indent++;
      for(JCCase c:sw.cases){
        if(c.labels.isEmpty()||c.labels.head instanceof JCDefaultCaseLabel)line("default:");
        else for(JCCaseLabel lab:c.labels){
          if(lab instanceof JCDefaultCaseLabel){line("default:");continue;}
          JCExpression e=((JCConstantCaseLabel)lab).expr;line("case "+caseConst(e)+":");
        }
        indent++;for(JCStatement x:c.stats)stmt(x);indent--;
      }
      indent--;line("}");return;
    }
    if(s instanceof JCBreak){JCBreak b=(JCBreak)s;line("break"+(b.label!=null?" "+b.label:"")+";");return;}
    if(s instanceof JCContinue){JCContinue b=(JCContinue)s;line("continue"+(b.label!=null?" "+b.label:"")+";");return;}
    if(s instanceof JCReturn){JCReturn r=(JCReturn)s;line("return"+(r.expr!=null?" "+expr(r.expr):"")+";");return;}
    if(s instanceof JCThrow){line("throw "+expr(((JCThrow)s).expr)+";");return;}
    if(s instanceof JCTry){
      JCTry t=(JCTry)s;line("try {");indent++;for(JCStatement x:t.body.stats)stmt(x);indent--;
      if(!t.catchers.isEmpty()){
        if(t.catchers.size()>1)throw new RuntimeException("multi-catch try not supported: "+t);
        JCCatch c=t.catchers.head;line("} catch ("+jsName(c.param.name.toString())+") {");indent++;
        // A handler only catches its declared type (catch(IOException) must let a NullPointerException through).
        line("J.rethrowUnless("+jsName(c.param.name.toString())+",\""+c.param.vartype.type.tsym.name+"\");");
        for(JCStatement x:c.body.stats)stmt(x);indent--;
      }
      if(t.finalizer!=null){line("} finally {");indent++;for(JCStatement x:t.finalizer.stats)stmt(x);indent--;}
      line("}");return;
    }
    if(s instanceof JCSynchronized){stmt(((JCSynchronized)s).body);return;}
    if(s instanceof JCSkip){line(";");return;}
    if(s instanceof JCClassDecl){line("/* local class omitted */");return;}
    if(s instanceof JCAssert){return;}
    throw new RuntimeException("statement "+s.getClass()+": "+s);
  }
  static void body(JCStatement s){if(s instanceof JCBlock)for(JCStatement x:((JCBlock)s).stats)stmt(x);else stmt(s);}
  static String switchSelector(JCExpression e){Type t=type(e);if(isString(t))return expr(e);return toNumber(e);}
  static String caseConst(JCExpression e){
    Object c=e.type!=null?e.type.constValue():null;
    if(c instanceof Character)return Integer.toString((Character)c);
    if(c instanceof Number)return c.toString();
    if(c instanceof String)return jsString((String)c);
    if(c==null){Symbol s=TreeInfo.symbol(e);if(s instanceof Symbol.VarSymbol&&((Symbol.VarSymbol)s).getConstValue()!=null)return ((Symbol.VarSymbol)s).getConstValue().toString();}
    return expr(e);
  }
  static String cond(JCExpression e){return expr(e);}
  // ---------------------------------------------------------------- expressions
  static String exprStmt(JCExpression e){return expr(e);}
  static String jsString(String s){
    StringBuilder b=new StringBuilder("\"");
    for(char c:s.toCharArray()){if(c=='"'||c=='\\')b.append('\\').append(c);else if(c<32||c>126)b.append(String.format("\\u%04x",(int)c));else b.append(c);}
    return b.append('"').toString();
  }
  static String constant(JCExpression e){
    Object c=e.type!=null?e.type.constValue():null;
    if(c==null)return null;
    Type t=e.type;
    if(isBool(t))return ((Integer)c)!=0?"true":"false";
    if(isLong(t))return c.toString()+"n";
    if(isChar(t))return Integer.toString(((Number)(c instanceof Character?(int)(Character)c:c)).intValue());
    if(isString(t))return jsString((String)c);
    if(c instanceof Number){
      if(isFloat(t))return c.toString();
      return Long.toString(((Number)c).longValue());
    }
    return null;
  }
  static String expr(JCExpression e){
    String k=constant(e);
    if(k!=null)return k.startsWith("-")?"("+k+")":k;
    if(e instanceof JCParens)return "("+expr(((JCParens)e).expr)+")";
    if(e instanceof JCLiteral){
      JCLiteral l=(JCLiteral)e;
      if(l.value==null)return "null";
      return l.value.toString();
    }
    if(e instanceof JCIdent){
      JCIdent id=(JCIdent)e;Symbol s=id.sym;
      if(s==null)return id.name.toString();
      if(s.name.toString().equals("this"))return "this";
      if(s.kind==Kinds.Kind.VAR){
        if(s.owner!=null&&s.owner.kind==Kinds.Kind.TYP){
          boolean st=(s.flags()&Flags.STATIC)!=0;
          return (st?s.owner.name.toString():"this")+"."+jsName(s.name.toString());
        }
        return jsName(s.name.toString());
      }
      if(s.kind==Kinds.Kind.TYP)return s.name.toString();
      return id.name.toString();
    }
    if(e instanceof JCFieldAccess){
      JCFieldAccess f=(JCFieldAccess)e;Symbol s=f.sym;
      String n=f.name.toString();
      if(n.equals("length")&&f.selected.type!=null&&f.selected.type.getKind()==TypeKind.ARRAY)return expr(f.selected)+".length";
      if(s!=null&&s.kind==Kinds.Kind.TYP)return s.name.toString();
      if(s!=null&&(s.flags()&Flags.STATIC)!=0&&s.owner!=null)return s.owner.name.toString()+"."+jsName(n);
      return expr(f.selected)+"."+jsName(n);
    }
    if(e instanceof JCArrayAccess){JCArrayAccess a=(JCArrayAccess)e;return expr(a.indexed)+"["+toNumber(a.index)+"]";}
    if(e instanceof JCMethodInvocation)return call((JCMethodInvocation)e);
    if(e instanceof JCAssign){
      JCAssign a=(JCAssign)e;Type lt=type(a.lhs),rt=type(a.rhs);
      String rhs=expr(a.rhs);
      if(isLong(lt)&&!isLong(rt))rhs="BigInt("+rhs+")";
      if(isIntLike(lt)&&isLong(rt))rhs="Number(BigInt.asIntN(32,"+rhs+"))";
      return expr(a.lhs)+" = "+rhs;
    }
    if(e instanceof JCAssignOp)return assignOp((JCAssignOp)e);
    if(e instanceof JCUnary)return unary((JCUnary)e);
    if(e instanceof JCBinary)return binary((JCBinary)e);
    if(e instanceof JCTypeCast)return cast((JCTypeCast)e);
    if(e instanceof JCConditional){
      JCConditional c=(JCConditional)e;Type t=type(c);
      String a=expr(c.truepart),b=expr(c.falsepart);
      if(isLong(t)){a=toLong(c.truepart);b=toLong(c.falsepart);}
      return "("+cond(c.cond)+" ? "+a+" : "+b+")";
    }
    if(e instanceof JCNewArray)return newArray((JCNewArray)e);
    if(e instanceof JCNewClass)return newClass((JCNewClass)e);
    if(e instanceof JCInstanceOf){JCInstanceOf i=(JCInstanceOf)e;return "("+expr(i.expr)+" instanceof "+((JCTree)i.pattern).type.tsym.name+")";}
    throw new RuntimeException("expr "+e.getClass()+": "+e);
  }
  static String assignOp(JCAssignOp a){
    String op=opName(a.getTag().noAssignOp());
    Type lt=type(a.lhs);
    String target=expr(a.lhs);
    String bin=binaryText(op,a.lhs,a.rhs,lt.getKind()==TypeKind.LONG?lt:(isString(lt)?lt:a.operator.type.getReturnType()));
    boolean typedElem=a.lhs instanceof JCArrayAccess&&arrayCtor(lt)!=null;
    if(isBool(lt))return target+" = !!("+bin+")";
    if(isString(lt))return target+" = "+bin;
    if(typedElem&&!isLong(lt))return target+" = "+bin; // typed arrays narrow on store
    if(isLong(lt))return target+" = BigInt.asIntN(64,"+bin+")";
    if(isIntLike(lt)&&isLong(a.operator.type.getReturnType()))return target+" = "+narrow(lt,"Number(BigInt.asIntN(32,"+bin+"))");
    return target+" = "+narrow(lt,bin);
  }
  static String opName(JCTree.Tag t){
    switch(t){
      case PLUS:return "+";case MINUS:return "-";case MUL:return "*";case DIV:return "/";case MOD:return "%";
      case SL:return "<<";case SR:return ">>";case USR:return ">>>";case BITAND:return "&";case BITOR:return "|";case BITXOR:return "^";
      case AND:return "&&";case OR:return "||";case EQ:return "==";case NE:return "!=";case LT:return "<";case GT:return ">";case LE:return "<=";case GE:return ">=";
      default:throw new RuntimeException("op "+t);
    }
  }
  static String binary(JCBinary b){
    return binaryText(opName(b.getTag()),b.lhs,b.rhs,type(b));
  }
  /** Java binary operation with numeric promotion. rt = result type of the operation. */
  static String binaryText(String op,JCExpression l,JCExpression r,Type rt){
    Type lt=type(l),rtp=type(r);
    if(isString(rt)&&op.equals("+"))return "("+str(l)+" + "+str(r)+")";
    if(op.equals("&&")||op.equals("||"))return "("+expr(l)+" "+op+" "+expr(r)+")";
    boolean cmp=op.equals("==")||op.equals("!=")||op.equals("<")||op.equals(">")||op.equals("<=")||op.equals(">=");
    if(cmp){
      String jop=op.equals("==")?"===":op.equals("!=")?"!==":op;
      if(isLong(lt)||isLong(rtp))return "("+toLong(l)+" "+jop+" "+toLong(r)+")";
      return "("+expr(l)+" "+jop+" "+expr(r)+")";
    }
    if(isBool(rt)){ // non-short-circuit boolean & | ^
      return "!!(Number("+expr(l)+") "+op+" Number("+expr(r)+"))";
    }
    boolean shift=op.equals("<<")||op.equals(">>")||op.equals(">>>");
    if(isLong(rt)){
      String a=toLong(l);
      if(shift){String n="BigInt(("+toNumber(r)+")&63)";
        if(op.equals(">>>"))return "BigInt.asIntN(64,BigInt.asUintN(64,"+a+") >> "+n+")";
        if(op.equals("<<"))return "BigInt.asIntN(64,"+a+" << "+n+")";
        return "("+a+" >> "+n+")";}
      String bb=toLong(r);
      switch(op){case "+":case "-":case "*":return "BigInt.asIntN(64,"+a+" "+op+" "+bb+")";default:return "("+a+" "+op+" "+bb+")";}
    }
    if(isFloat(rt))return "("+expr(l)+" "+op+" "+expr(r)+")";
    String a=expr(l),bb=toNumber(r);
    if(isLong(lt))a="Number(BigInt.asIntN(32,"+a+"))";
    switch(op){
      case "+":case "-":return "(("+a+" "+op+" "+bb+")|0)";
      case "*":return "Math.imul("+a+","+bb+")";
      case "/":return "J.idiv("+a+","+bb+")";
      case "%":return "J.irem("+a+","+bb+")";
      case ">>>":return "(("+a+" >>> "+bb+")|0)";
      default:return "("+a+" "+op+" "+bb+")";
    }
  }
  static String str(JCExpression e){
    Type t=type(e);
    if(isChar(t))return "String.fromCharCode("+expr(e)+")";
    if(isString(t))return expr(e);
    if(isLong(t))return "String("+expr(e)+")";
    return "J.str("+expr(e)+")";
  }
  static String unary(JCUnary u){
    Type t=type(u.arg);
    switch(u.getTag()){
      case NOT:return "!"+expr(u.arg);
      case NEG:if(isLong(t))return "BigInt.asIntN(64,-"+expr(u.arg)+")";if(isFloat(t))return "(-"+expr(u.arg)+")";return "((-"+expr(u.arg)+")|0)";
      case POS:return expr(u.arg);
      case COMPL:if(isLong(t))return "(~"+expr(u.arg)+")";return "(~"+expr(u.arg)+")";
      case PREINC:case PREDEC:case POSTINC:case POSTDEC:{
        String target=expr(u.arg);boolean inc=u.getTag()==JCTree.Tag.PREINC||u.getTag()==JCTree.Tag.POSTINC;
        boolean pre=u.getTag()==JCTree.Tag.PREINC||u.getTag()==JCTree.Tag.PREDEC;
        boolean typedElem=u.arg instanceof JCArrayAccess&&arrayCtor(t)!=null;
        if(typedElem||t.getKind()==TypeKind.INT||isLong(t))return pre?(inc?"++":"--")+target:target+(inc?"++":"--");
        // byte/short/char variables: narrow after update
        String upd=target+" = "+narrow(t,target+(inc?" + 1":" - 1"));
        return pre?"("+upd+")":"((J.T.v = "+target+"), ("+upd+"), J.T.v)";
      }
      default:throw new RuntimeException("unary "+u.getTag());
    }
  }
  static String cast(JCTypeCast c){
    Type to=c.clazz.type,from=type(c.expr);
    String e=expr(c.expr);
    if(to.isPrimitive()){
      if(isLong(to)){if(isLong(from))return e;if(isFloat(from))return "BigInt(Math.trunc("+e+"))";return "BigInt("+e+")";}
      if(isFloat(to)){if(isLong(from))return "Number("+e+")";return e;}
      if(isBool(to))return e;
      String num=isLong(from)?"Number(BigInt.asIntN(32,"+e+"))":isFloat(from)?"J.f2i("+e+")":e;
      if(to.getKind()==TypeKind.INT)return isLong(from)||isFloat(from)?num:e;
      return narrow(to,num);
    }
    return e;
  }
  static String newArray(JCNewArray a){
    Type t=type(a);
    if(a.elems!=null){
      Type comp=((Type.ArrayType)t).elemtype;String ctor=arrayCtor(comp);
      StringBuilder b=new StringBuilder();
      for(JCExpression x:a.elems){if(b.length()>0)b.append(',');b.append(isLong(comp)?toLong(x):expr(x));}
      return ctor!=null?ctor+".of("+b+")":"["+b+"]";
    }
    return dims(a.dims,0,t);
  }
  static String dims(List<JCExpression> ds,int level,Type t){
    if(ds.isEmpty())return "null";
    Type comp=((Type.ArrayType)t).elemtype;
    String n=toNumber(ds.head);
    if(ds.tail.isEmpty()){
      String ctor=arrayCtor(comp);
      if(ctor!=null)return "new "+ctor+"("+n+")";
      return "J.filled("+n+","+defaultValue(comp)+")";
    }
    return "Array.from({length:"+n+"},()=>"+dims(ds.tail,level+1,comp)+")";
  }
  static String args(List<JCExpression> as,Symbol.MethodSymbol m){
    StringBuilder b=new StringBuilder();int i=0;
    for(JCExpression x:as){
      if(b.length()>0)b.append(',');
      Type pt=m!=null&&i<m.params.size()?m.params.get(i).type:null;
      if(pt!=null&&isLong(pt)&&!isLong(type(x)))b.append("BigInt(").append(expr(x)).append(")");
      else if(pt!=null&&isIntLike(pt)&&isLong(type(x)))b.append("Number(BigInt.asIntN(32,").append(expr(x)).append("))");
      else b.append(expr(x));
      i++;
    }
    return b.toString();
  }
  static String newClass(JCNewClass n){
    String cls=n.clazz.type.tsym.name.toString();
    Symbol.MethodSymbol ctor=(Symbol.MethodSymbol)n.constructor;
    switch(cls){
      case "Integer":case "Long":case "Short":case "Byte":return "("+expr(n.args.head)+")";
      case "Hashtable":case "HashMap":return "new J.JHashtable()";
      case "StringBuffer":case "StringBuilder":return "new J.JStringBuffer("+(n.args.isEmpty()?"":str(n.args.head))+")";
      case "String":return "J.newString("+args(n.args,ctor)+")";
      case "Random":return "new J.JRandom("+args(n.args,ctor)+")";
      case "ByteArrayInputStream":return "new J.ByteArrayInputStream("+args(n.args,ctor)+")";
      case "Thread":return "new J.JThread("+args(n.args,ctor)+")";
      case "Exception":case "RuntimeException":case "IOException":case "MIDletStateChangeException":case "MediaException":return "new Error("+args(n.args,ctor)+")";
      default:return "new "+cls+"("+args(n.args,ctor)+")";
    }
  }
  static String call(JCMethodInvocation c){
    Symbol.MethodSymbol m=(Symbol.MethodSymbol)TreeInfo.symbol(c.meth);
    String name=m!=null?m.name.toString():TreeInfo.name(c.meth).toString();
    String owner=m!=null&&m.owner!=null?m.owner.name.toString():"";
    String recv=null;
    if(c.meth instanceof JCFieldAccess)recv=expr(((JCFieldAccess)c.meth).selected);
    String as=args(c.args,m);
    // Library mappings
    switch(owner){
      case "Math":return "J.math_"+name+"("+as+")";
      case "System":
        if(name.equals("arraycopy"))return "J.arraycopy("+as+")";
        if(name.equals("currentTimeMillis"))return "J.currentTimeMillis()";
        if(name.equals("gc"))return "undefined";
        return "J.system_"+name+"("+as+")";
      case "Throwable":case "Exception":return "J.throwable_"+name+"("+(recv==null?"this":recv)+(as.isEmpty()?"":","+as)+")";
      case "Thread":return "J.thread_"+name+"("+(recv!=null&&!recv.equals("Thread")?recv+(as.isEmpty()?"":","):"")+as+")";
      case "String":
        // Static methods (String.valueOf) have no receiver: the class name must not become the first argument.
        if(m!=null&&(m.flags()&Flags.STATIC)!=0)return "J.string_"+name+"("+as+")";
        return "J.string_"+name+"("+recv+(as.isEmpty()?"":","+as)+")";
      case "StringBuffer":case "StringBuilder":
        if(name.equals("append")&&c.args.size()==1)return recv+".append("+str(c.args.head)+")";
        return recv+"."+name+"("+as+")";
      case "Integer":case "Long":case "Short":case "Byte":case "Character":case "Boolean":case "Number":
        if(recv!=null&&!recv.equals(owner))return "J.boxed_"+name+"("+recv+(as.isEmpty()?"":","+as)+")";
        return "J."+owner.toLowerCase()+"_"+name+"("+as+")";
      case "Hashtable":case "HashMap":case "Object":
        if(name.equals("getClass"))return "J.classOf("+recv+")";
        // Monitor methods: the browser runs no second thread, so nothing waits on or is woken by them.
        if(owner.equals("Object")&&(name.equals("wait")||name.equals("notify")||name.equals("notifyAll")))return "J.monitor_"+name+"("+(recv==null?"this":recv)+")";
        return recv+"."+name+"("+as+")";
    }
    String mn=m!=null?mangle(m):name;
    if(c.meth instanceof JCIdent){
      if(m!=null&&(m.flags()&Flags.STATIC)!=0)return owner+"."+mn+"("+as+")";
      return "this."+mn+"("+as+")";
    }
    if(m!=null&&(m.flags()&Flags.STATIC)!=0)return owner+"."+mn+"("+as+")";
    return recv+"."+mn+"("+as+")";
  }
}
