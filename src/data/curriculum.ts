import { ExecutionResult, formatPyValue } from '../lib/pythonEngine';

export interface LessonSection {
  heading: string;
  explanation: string;
  codeExample: string;
  note?: string;
}

export interface ChallengeTest {
  id: string;
  label: string;
  check: (result: ExecutionResult, code: string) => boolean;
}

export interface LessonChallenge {
  title: string;
  prompt: string;
  starterCode: string;
  solutionCode: string;
  hint: string;
  stdin?: string;
  tests: ChallengeTest[];
}

export interface Lesson {
  id: string;
  number: string;
  trackId: string;
  title: string;
  duration: string;
  summary: string;
  sections: LessonSection[];
  challenge: LessonChallenge;
}

export interface Track {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  levelLabel: string;
  imageUrl: string;
  imageAlt: string;
}

export interface SandboxPreset {
  id: string;
  title: string;
  category: string;
  description: string;
  code: string;
  stdin?: string;
}

export interface CheatsheetItem {
  id: string;
  category: 'basics' | 'control' | 'structures' | 'oop';
  categoryLabel: string;
  title: string;
  syntax: string;
  description: string;
  example: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  code?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  relatedLessonId: string;
}

export const TRACKS: Track[] = [
  {
    id: 'basics',
    number: '階段 01',
    title: '基礎語法與資料型別',
    subtitle: '建立變數記憶體模型、掌握數值運算與 f-string 字串處理',
    levelLabel: '入門基礎',
    imageUrl: '/src/assets/images/track_python_basics_1794898989340.jpg',
    imageAlt: 'Python 變數儲存方塊與資料流等距技術圖解',
  },
  {
    id: 'control',
    number: '階段 02',
    title: '流程控制與函式邏輯',
    subtitle: '運用條件分支、迴圈迭代與可重複使用的函式拆解問題',
    levelLabel: '核心邏輯',
    imageUrl: '/src/assets/images/track_control_flow_1794898989765.jpg',
    imageAlt: '條件分支與迴圈結構建築製圖風格圖解',
  },
  {
    id: 'data-oop',
    number: '階段 03',
    title: '資料結構與物件導向',
    subtitle: '精通串列、字典映射與類別封裝，寫出結構清晰的程式',
    levelLabel: '進階實戰',
    imageUrl: '/src/assets/images/track_data_oop_1794898989725.jpg',
    imageAlt: '字典鍵值結構與物件導向節點等距科學圖解',
  },
];

export const LESSONS: Lesson[] = [
  {
    id: 'l1',
    number: '01',
    trackId: 'basics',
    title: '變數、輸出與 f-string 格式化',
    duration: '12 分鐘',
    summary: '理解變數如何指向記憶體中的資料，並用 f-string 精準排版輸出結果。',
    sections: [
      {
        heading: '變數賦值與動態型別',
        explanation:
          '在 Python 中不需要事先宣告型別，使用等號「=」即可將右側的值綁定到左側變數名稱。變數名稱建議使用小寫字母與底線（snake_case）。',
        codeExample: `course_name = "Python 程式設計"
students = 42
rating = 4.9
is_active = True

print(course_name, students, rating, is_active)`,
        note: '使用右側的「單步透視」功能，可以清楚看見每一行執行後變數的實際型別與數值變化。',
      },
      {
        heading: 'f-string 字串格式化',
        explanation:
          '在字串引號前加上字母 f，就能直接在大括號 { } 內放入變數或運算式，甚至搭配 :.2f 控制小數點位數。',
        codeExample: `item = "藍牙機械鍵盤"
price = 2480
discount = 0.85
final_price = price * discount

print(f"商品：{item}")
print(f"折後價格：{final_price:.0f} 元（省下 {price - final_price:.0f} 元）")`,
      },
    ],
    challenge: {
      title: '實作：個人學習名片產生器',
      prompt:
        '請建立三個變數：name（字串 "Alex"）、hours（整數 15）、goal（字串 "資料分析"），並使用 print() 與 f-string 輸出一行：\n「學員 Alex 已累積 15 小時，目標是 資料分析」',
      starterCode: `# 請在下方定義三個變數
name = "Alex"
hours = 15
goal = "資料分析"

# 請使用 f-string 印出指定格式的句子
`,
      solutionCode: `name = "Alex"
hours = 15
goal = "資料分析"

print(f"學員 {name} 已累積 {hours} 小時，目標是 {goal}")`,
      hint: '使用 print(f"學員 {name} 已累積 {hours} 小時，目標是 {goal}") 即可將變數直接嵌入字串中。',
      tests: [
        {
          id: 't1',
          label: '程式無語法或執行錯誤',
          check: (res) => res.success,
        },
        {
          id: 't2',
          label: '定義正確型別的變數 name、hours、goal',
          check: (res) =>
            res.finalGlobals.name === 'Alex' &&
            res.finalGlobals.hours === 15 &&
            res.finalGlobals.goal === '資料分析',
        },
        {
          id: 't3',
          label: '輸出內容符合指定格式',
          check: (res) => res.output.trim() === '學員 Alex 已累積 15 小時，目標是 資料分析',
        },
      ],
    },
  },
  {
    id: 'l2',
    number: '02',
    trackId: 'basics',
    title: '數值運算與資料型別轉換',
    duration: '15 分鐘',
    summary: '區分整數除 (//)、餘數 (%) 與次方 (**)，避免常見的字串與數字相加錯誤。',
    sections: [
      {
        heading: '七種核心算術運算子',
        explanation:
          'Python 提供標準四則運算外，還有專門取整數商的「//」、取餘數的「%」，以及計算次方的「**」。注意單斜線「/」的結果永遠是浮點數 float。',
        codeExample: `total_seconds = 135
minutes = total_seconds // 60
seconds = total_seconds % 60

print(f"{total_seconds} 秒等於 {minutes} 分 {seconds} 秒")
print("2 的 10 次方 =", 2 ** 10)`,
      },
      {
        heading: '顯式型別轉換',
        explanation:
          '透過 int()、float()、str() 可以安全轉換資料型別，避免將文字 "100" 直接拿來做數學加法時觸發 TypeError。',
        codeExample: `raw_price = "350"
tax_rate = "0.05"

price = int(raw_price)
total = price * (1 + float(tax_rate))
print(f"含稅總金額：{round(total, 1)}")`,
      },
    ],
    challenge: {
      title: '實作：雙位數金額拆解與總計',
      prompt:
        '假設商品單價字串為 unit_str = "125"，購買數量為 qty = 3，折扣金額為 discount = 50。\n請計算總金額 total = int(unit_str) * qty - discount，並印出「實付金額：325」。',
      starterCode: `unit_str = "125"
qty = 3
discount = 50

# 計算 total 並輸出結果
`,
      solutionCode: `unit_str = "125"
qty = 3
discount = 50

total = int(unit_str) * qty - discount
print(f"實付金額：{total}")`,
      hint: '先用 int(unit_str) 將文字轉為整數，再乘以 qty 並減去 discount。',
      tests: [
        {
          id: 't1',
          label: '成功執行且未發生 TypeError',
          check: (res) => res.success,
        },
        {
          id: 't2',
          label: '變數 total 的值為整數 325',
          check: (res) => res.finalGlobals.total === 325,
        },
        {
          id: 't3',
          label: '終端輸出「實付金額：325」',
          check: (res) => res.output.trim() === '實付金額：325',
        },
      ],
    },
  },
  {
    id: 'l3',
    number: '03',
    trackId: 'basics',
    title: '字串切片與文字清理方法',
    duration: '15 分鐘',
    summary: '運用 [start:stop:step] 切片語法擷取子字串，並用內建方法標準化文字格式。',
    sections: [
      {
        heading: '正向、負向索引與切片',
        explanation:
          '字串中每個字元都有索引位置，從左到右由 0 開始，從右到左由 -1 開始。切片 [start:stop] 包含起點但「不包含」終點。',
        codeExample: `code = "PY-2026-TAIPEI"
prefix = code[:2]
year = code[3:7]
reversed_code = code[::-1]

print("前綴:", prefix)
print("年份:", year)
print("反轉:", reversed_code)`,
      },
      {
        heading: '常用字串處理方法鏈',
        explanation:
          '字串方法不會修改原本的字串，而是回傳一個新的字串，因此可以連續串接 .strip()、.upper()、.replace() 來清理資料。',
        codeExample: `raw_email = "   User.Name@Example.COM  "
clean_email = raw_email.strip().lower()
domain = clean_email.split("@")[1]

print("清理後:", clean_email)
print("網域:", domain)`,
      },
    ],
    challenge: {
      title: '實作：訂單編號標準化',
      prompt:
        '收到一筆格式混亂的原始字串 raw_id = "  ord-2026-089  "。\n請移除前後空白、全部轉成大寫，並將 "-" 替換為 "_" 存進變數 clean_id，最後印出 clean_id（結果應為 ORD_2026_089）。',
      starterCode: `raw_id = "  ord-2026-089  "

# 清理字串並存進 clean_id
clean_id = ""
print(clean_id)`,
      solutionCode: `raw_id = "  ord-2026-089  "

clean_id = raw_id.strip().upper().replace("-", "_")
print(clean_id)`,
      hint: '可以串接三個字串方法：.strip().upper().replace("-", "_")。',
      tests: [
        {
          id: 't1',
          label: '程式執行成功',
          check: (res) => res.success,
        },
        {
          id: 't2',
          label: '變數 clean_id 為 "ORD_2026_089"',
          check: (res) => res.finalGlobals.clean_id === 'ORD_2026_089',
        },
        {
          id: 't3',
          label: '輸出結果為 ORD_2026_089',
          check: (res) => res.output.trim() === 'ORD_2026_089',
        },
      ],
    },
  },
  {
    id: 'l4',
    number: '04',
    trackId: 'control',
    title: '條件判斷與布林邏輯',
    duration: '15 分鐘',
    summary: '掌握 if / elif / else 縮排結構，結合 and、or、not 處理多條件決策。',
    sections: [
      {
        heading: '多層分支與縮排規範',
        explanation:
          'Python 依靠四個空格的「縮排」來區分程式區塊。條件會由上而下依序檢查，只要其中一個條件為 True，就會執行該區塊並略過後續分支。',
        codeExample: `score = 84

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "D"

print(f"分數 {score} 對應等第：{grade}")`,
      },
      {
        heading: '邏輯運算子與區間寫法',
        explanation:
          'Python 支援直覺的鏈式比較（例如 18 <= age <= 65），也能使用 and（兩者皆真）、or（其一為真）組合複合條件。',
        codeExample: `is_member = True
cart_total = 950

if is_member and cart_total >= 800:
    shipping = 0
else:
    shipping = 80

print(f"運費計算結果：{shipping} 元")`,
      },
    ],
    challenge: {
      title: '實作：票價分級計算器',
      prompt:
        '設定變數 age = 20、is_student = True。\n規則：6 歲以下（含）免費 (0 元)；65 歲以上（含）半價 (150 元)；若是學生 (is_student 為 True) 優待票 200 元；其餘全票 300 元。\n請將計算結果存進 ticket_price 並印出它。',
      starterCode: `age = 20
is_student = True
ticket_price = 0

# 請使用 if / elif / else 完成判斷


print(ticket_price)`,
      solutionCode: `age = 20
is_student = True

if age <= 6:
    ticket_price = 0
elif age >= 65:
    ticket_price = 150
elif is_student:
    ticket_price = 200
else:
    ticket_price = 300

print(ticket_price)`,
      hint: '依序檢查 age <= 6、age >= 65、is_student，最後用 else 設定為 300。',
      tests: [
        {
          id: 't1',
          label: '程式正確執行無縮排或語法錯誤',
          check: (res) => res.success,
        },
        {
          id: 't2',
          label: '使用 if / elif 條件語句',
          check: (_res, code) => /\bif\b/.test(code) && /\belif\b/.test(code),
        },
        {
          id: 't3',
          label: '變數 ticket_price 與輸出皆為 200',
          check: (res) => res.finalGlobals.ticket_price === 200 && res.output.trim() === '200',
        },
      ],
    },
  },
  {
    id: 'l5',
    number: '05',
    trackId: 'control',
    title: '迴圈結構：for、while 與 range',
    duration: '18 分鐘',
    summary: '使用 for 走訪序列與 range() 產生數列，並理解 break 與 continue 的流程跳轉。',
    sections: [
      {
        heading: 'for 迴圈與 range() 步進',
        explanation:
          'range(start, stop, step) 會產生一組依序遞增或遞減的整數。搭配累加變數，可以快速完成統計與批次處理。',
        codeExample: `total = 0
for n in range(2, 11, 2):
    total += n
    print(f"加上 {n}，目前總和：{total}")`,
      },
      {
        heading: 'while 迴圈與 break 中斷',
        explanation:
          '當事先不知道需要重複幾次、只知道停止條件時適合用 while。使用 break 可以立刻跳出最內層迴圈。',
        codeExample: `energy = 100
rounds = 0

while energy > 0:
    rounds += 1
    energy -= 35
    if rounds == 2:
        print("第 2 回合觸發中斷機制")
        break

print(f"結束時剩餘能量：{energy}")`,
      },
    ],
    challenge: {
      title: '實作：計算 1 到 20 的奇數總和',
      prompt:
        '請使用 for 迴圈搭配 range()，計算 1 到 20（含）之間所有「奇數」的總和，將結果存入變數 odd_sum 並印出（正確答案應為 100）。',
      starterCode: `odd_sum = 0

# 請使用 for 迴圈累加 1 到 20 的奇數


print(odd_sum)`,
      solutionCode: `odd_sum = 0

for n in range(1, 21, 2):
    odd_sum += n

print(odd_sum)`,
      hint: 'range(1, 21, 2) 會依序產生 1, 3, 5, ..., 19，或者用 range(1, 21) 搭配 if n % 2 != 0。',
      tests: [
        {
          id: 't1',
          label: '使用 for 迴圈',
          check: (_res, code) => /\bfor\b/.test(code),
        },
        {
          id: 't2',
          label: '變數 odd_sum 為 100',
          check: (res) => res.finalGlobals.odd_sum === 100,
        },
        {
          id: 't3',
          label: '輸出為 100',
          check: (res) => res.output.trim() === '100',
        },
      ],
    },
  },
  {
    id: 'l6',
    number: '06',
    trackId: 'control',
    title: '函式定義、預設參數與遞迴',
    duration: '18 分鐘',
    summary: '將重複邏輯封裝成 def 函式，理解區域變數作用域與 return 回傳機制。',
    sections: [
      {
        heading: '函式參數、預設值與 return',
        explanation:
          '函式把「輸入參數」轉換為「回傳結果」。帶有預設值的參數必須寫在沒有預設值的參數後方。請留意 print() 只是顯示畫面，return 才能把值交給外部程式繼續運算。',
        codeExample: `def calc_bmi(weight, height_cm=170):
    height_m = height_cm / 100
    bmi = weight / (height_m ** 2)
    return round(bmi, 1)

result1 = calc_bmi(68, 175)
result2 = calc_bmi(60)
print("BMI 1:", result1)
print("BMI 2:", result2)`,
      },
      {
        heading: '遞迴呼叫與呼叫堆疊',
        explanation:
          '函式可以呼叫自己，這稱為遞迴。每個遞迴都必須有明確的「終止條件 (Base Case)」，透過右側的單步透視可以觀察呼叫堆疊 (Call Stack) 如何層層展開與返回。',
        codeExample: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

ans = factorial(4)
print(f"4! = {ans}")`,
      },
    ],
    challenge: {
      title: '實作：攝氏轉華氏溫度函式',
      prompt:
        '請定義一個名為 c_to_f(c) 的函式，公式為 c * 9 / 5 + 32，並回傳結果。\n接著呼叫 temp_f = c_to_f(25) 並印出 temp_f（應為 77.0）。',
      starterCode: `# 請定義函式 c_to_f(c)


temp_f = c_to_f(25)
print(temp_f)`,
      solutionCode: `def c_to_f(c):
    return c * 9 / 5 + 32

temp_f = c_to_f(25)
print(temp_f)`,
      hint: '函式開頭寫 def c_to_f(c):，內部使用 return c * 9 / 5 + 32。',
      tests: [
        {
          id: 't1',
          label: '定義函式 def c_to_f',
          check: (_res, code) => /def\s+c_to_f\s*\(/.test(code),
        },
        {
          id: 't2',
          label: 'temp_f 計算結果為 77.0',
          check: (res) => res.finalGlobals.temp_f === 77,
        },
        {
          id: 't3',
          label: '輸出結果為 77 或 77.0',
          check: (res) => res.output.trim() === '77' || res.output.trim() === '77.0',
        },
      ],
    },
  },
  {
    id: 'l7',
    number: '07',
    trackId: 'data-oop',
    title: '串列 (List) 操作與串列推導式',
    duration: '16 分鐘',
    summary: '運用動態串列管理有序集合，並學會 Python 最具代表性的串列推導式語法。',
    sections: [
      {
        heading: '串列新增、移除與排序',
        explanation:
          '串列是有序且可變的容器。常用的 .append() 會在尾端加入元素，.pop() 取出並移除元素，sorted() 則能產生排序後的新串列。',
        codeExample: `tasks = ["備份資料", "撰寫報告"]
tasks.append("程式碼審查")
done = tasks.pop(0)

print("已完成:", done)
print("待辦清單:", tasks)`,
      },
      {
        heading: '串列推導式 (List Comprehension)',
        explanation:
          '串列推導式把「迴圈產生」與「條件過濾」濃縮成一行極具可讀性的語法：[運算式 for 變數 in 來源 if 條件]。',
        codeExample: `scores = [55, 82, 91, 48, 76, 88]
passed = [s for s in scores if s >= 60]
bonus_scores = [s + 5 for s in passed]

print("及格分數:", passed)
print("加分後:", bonus_scores)`,
      },
    ],
    challenge: {
      title: '實作：偶數平方篩選器',
      prompt:
        '給定串列 nums = [1, 2, 3, 4, 5, 6]。\n請選出其中的「偶數」並計算它們的平方，將結果存成串列 even_squares（應為 [4, 16, 36]）並印出。',
      starterCode: `nums = [1, 2, 3, 4, 5, 6]

# 請產出偶數的平方串列
even_squares = []
print(even_squares)`,
      solutionCode: `nums = [1, 2, 3, 4, 5, 6]

even_squares = [x ** 2 for x in nums if x % 2 == 0]
print(even_squares)`,
      hint: '試試串列推導式：[x ** 2 for x in nums if x % 2 == 0]。',
      tests: [
        {
          id: 't1',
          label: '程式順利執行完成',
          check: (res) => res.success,
        },
        {
          id: 't2',
          label: 'even_squares 等於 [4, 16, 36]',
          check: (res) => formatPyValue(res.finalGlobals.even_squares, true) === '[4, 16, 36]',
        },
        {
          id: 't3',
          label: '終端輸出 [4, 16, 36]',
          check: (res) => res.output.trim() === '[4, 16, 36]',
        },
      ],
    },
  },
  {
    id: 'l8',
    number: '08',
    trackId: 'data-oop',
    title: '字典 (Dict) 鍵值映射與集合 (Set)',
    duration: '16 分鐘',
    summary: '使用字典建立 O(1) 快速查找結構，並利用集合自動去除重複項目。',
    sections: [
      {
        heading: '字典新增、讀取與安全取值',
        explanation:
          '字典由成對的「鍵 (Key) : 值 (Value)」組成。比起直接用 d[key]，使用 d.get(key, 預設值) 在鍵不存在時不會拋出 KeyError。',
        codeExample: `stock = {"apple": 12, "banana": 5}
stock["orange"] = 8
stock["apple"] += 3

mango_count = stock.get("mango", 0)
for fruit, qty in stock.items():
    print(f"{fruit}: {qty} 顆")
print("芒果庫存:", mango_count)`,
      },
      {
        heading: '集合 (Set) 去重與交集運算',
        explanation:
          '集合內的元素不會重複且無固定順序，特別適合用來過濾重複資料，或透過 .intersection() 找出兩份名單的共同成員。',
        codeExample: `visitors = ["A01", "A02", "A01", "A03", "A02"]
unique_visitors = set(visitors)
vip = {"A02", "A09"}

print("不重複訪客數:", len(unique_visitors))
print("今日造訪的 VIP:", unique_visitors.intersection(vip))`,
      },
    ],
    challenge: {
      title: '實作：統計字元出現次數',
      prompt:
        '給定字串 word = "banana"。\n請使用字典 counts 統計每個字母出現的次數，最後印出 counts["a"]（應為 3）與 counts["n"]（應為 2）。',
      starterCode: `word = "banana"
counts = {}

# 請用迴圈統計每個字元出現次數


print(counts["a"], counts["n"])`,
      solutionCode: `word = "banana"
counts = {}

for ch in word:
    counts[ch] = counts.get(ch, 0) + 1

print(counts["a"], counts["n"])`,
      hint: '在迴圈中使用 counts[ch] = counts.get(ch, 0) + 1 可以精簡地完成計數。',
      tests: [
        {
          id: 't1',
          label: '程式正確執行',
          check: (res) => res.success,
        },
        {
          id: 't2',
          label: 'counts 字典包含 b:1, a:3, n:2',
          check: (res) => {
            const c = res.finalGlobals.counts;
            if (!c || typeof c !== 'object' || c.__kind !== 'dict') return false;
            const map = Object.fromEntries(c.entries.map(([k, v]) => [String(k), v]));
            return map.b === 1 && map.a === 3 && map.n === 2;
          },
        },
        {
          id: 't3',
          label: '輸出結果為 3 2',
          check: (res) => res.output.trim() === '3 2',
        },
      ],
    },
  },
  {
    id: 'l9',
    number: '09',
    trackId: 'data-oop',
    title: '類別 (Class) 與物件導向設計',
    duration: '20 分鐘',
    summary: '定義藍圖類別、__init__ 初始化方法與實例屬性，打造可維護的資料模型。',
    sections: [
      {
        heading: '類別定義與 __init__ 建構子',
        explanation:
          'class 就像物件的設計藍圖。當我們呼叫類別建立實體時，Python 會自動執行 __init__ 方法，而第一個參數 self 代表「這個物件自己」。',
        codeExample: `class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount
        return self.balance

acc = BankAccount("Mei", 1000)
acc.deposit(500)
print(f"{acc.owner} 的帳戶餘額：{acc.balance}")`,
      },
    ],
    challenge: {
      title: '實作：矩形面積類別',
      prompt:
        '請定義一個名為 Rectangle 的類別：\n1. __init__(self, width, height) 儲存 self.width 與 self.height\n2. 定義方法 area(self) 回傳 width * height\n最後建立物件 rect = Rectangle(6, 4)，並印出 rect.area()（應為 24）。',
      starterCode: `# 請定義 Rectangle 類別
class Rectangle:
    def __init__(self, width, height):
        pass

    def area(self):
        pass

rect = Rectangle(6, 4)
print(rect.area())`,
      solutionCode: `class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

rect = Rectangle(6, 4)
print(rect.area())`,
      hint: '在 __init__ 中設定 self.width = width 與 self.height = height，並在 area(self) 回傳 self.width * self.height。',
      tests: [
        {
          id: 't1',
          label: '程式正確執行且未發生 AttributeError',
          check: (res) => res.success,
        },
        {
          id: 't2',
          label: 'rect 物件具有正確的 width 與 height 屬性',
          check: (res) => {
            const rect = res.finalGlobals.rect;
            if (!rect || typeof rect !== 'object' || rect.__kind !== 'instance') return false;
            return rect.attrs.width === 6 && rect.attrs.height === 4;
          },
        },
        {
          id: 't3',
          label: '印出面積結果為 24',
          check: (res) => res.output.trim() === '24',
        },
      ],
    },
  },
];

export const SANDBOX_PRESETS: SandboxPreset[] = [
  {
    id: 'fibonacci',
    title: '費氏數列遞迴追蹤',
    category: '函式與呼叫堆疊',
    description: '觀察函式在記憶體中如何逐層展開與收斂回傳數值。',
    code: `def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

results = []
for i in range(6):
    val = fib(i)
    results.append(val)
    print(f"fib({i}) = {val}")

print("數列結果:", results)`,
  },
  {
    id: 'bubble_sort',
    title: '氣泡排序逐步視覺化',
    category: '迴圈與串列',
    description: '透過單步執行觀察相鄰元素如何兩兩比較並完成交換。',
    code: `nums = [29, 10, 14, 37, 13]
n = len(nums)

for i in range(n):
    for j in range(0, n - i - 1):
        if nums[j] > nums[j + 1]:
            nums[j], nums[j + 1] = nums[j + 1], nums[j]
            print(f"交換後狀態：{nums}")

print("排序完成：", nums)`,
  },
  {
    id: 'shopping_cart',
    title: '購物車類別與方法操作',
    category: '物件導向設計',
    description: '示範如何用類別封裝商品清單、加入商品以及計算結帳總金額。',
    code: `class ShoppingCart:
    def __init__(self, owner):
        self.owner = owner
        self.items = []

    def add_item(self, name, price):
        self.items.append({"name": name, "price": price})

    def total(self):
        return sum([item["price"] for item in self.items])

cart = ShoppingCart("Lin")
cart.add_item("機械鍵盤", 2400)
cart.add_item("滑鼠墊", 450)
print(f"{cart.owner} 的購物車共有 {len(cart.items)} 件商品")
print(f"總金額：{cart.total()} 元")`,
  },
  {
    id: 'word_freq',
    title: '文字頻率統計字典',
    category: '字串與字典',
    description: '清洗句子並統計每個單字出現的次數，找出最常出現的關鍵字。',
    code: `text = "python is clean and python is fast and python is fun"
words = text.split()
freq = {}

for w in words:
    freq[w] = freq.get(w, 0) + 1

for word, count in freq.items():
    print(f"{word:>8} : {count} 次")`,
  },
  {
    id: 'prime_filter',
    title: '質數判斷與串列推導',
    category: '演算法思維',
    description: '結合輔助函式與串列推導式，快速找出 2 到 30 之間的所有質數。',
    code: `def is_prime(n):
    if n < 2:
        return False
    for d in range(2, n):
        if n % d == 0:
            return False
    return True

primes = [x for x in range(2, 31) if is_prime(x)]
print("30 以內的質數：", primes)
print(f"共找到 {len(primes)} 個質數")`,
  },
];

export const CHEATSHEET_ITEMS: CheatsheetItem[] = [
  {
    id: 'cs1',
    category: 'basics',
    categoryLabel: '基礎與字串',
    title: 'f-string 格式化與小數控制',
    syntax: 'f"{變數:.2f}"',
    description: '將變數或運算式嵌入字串，並指定浮點數小數位數或千分位分隔。',
    example: `price = 1234.567\nprint(f"金額：{price:.2f} 元")`,
  },
  {
    id: 'cs2',
    category: 'basics',
    categoryLabel: '基礎與字串',
    title: '字串切片 [start:stop:step]',
    syntax: 'text[起始:結束:步進]',
    description: '擷取字串或串列片段，使用 [::-1] 可快速反轉序列內容。',
    example: `s = "Python2026"\nprint(s[:6], s[-4:], s[::-1])`,
  },
  {
    id: 'cs3',
    category: 'basics',
    categoryLabel: '基礎與字串',
    title: '字串分割與合併',
    syntax: 'sep.join(str.split())',
    description: 'split() 將字串拆解為串列；join() 以指定分隔符號重新組合成字串。',
    example: `tags = "python, data, web".split(", ")\nprint(" | ".join(tags))`,
  },
  {
    id: 'cs4',
    category: 'basics',
    categoryLabel: '基礎與字串',
    title: '整數除法與餘數運算',
    syntax: 'a // b, a % b',
    description: '// 回傳整數商；% 回傳餘數，常用於判斷奇偶數或時間單位換算。',
    example: `mins = 145\nprint(f"{mins // 60} 小時 {mins % 60} 分鐘")`,
  },
  {
    id: 'cs5',
    category: 'control',
    categoryLabel: '流程與函式',
    title: '三元條件運算式',
    syntax: '值A if 條件 else 值B',
    description: '在單一行內依據條件快速決定賦予的數值。',
    example: `score = 72\nstatus = "及格" if score >= 60 else "待加強"\nprint(status)`,
  },
  {
    id: 'cs6',
    category: 'control',
    categoryLabel: '流程與函式',
    title: 'enumerate 索引走訪',
    syntax: 'for idx, val in enumerate(seq):',
    description: '在 for 迴圈中同時取得元素的索引編號與內容值，免去手動計數器。',
    example: `langs = ["Python", "SQL", "Rust"]\nfor i, name in enumerate(langs, 1):\n    print(f"{i}. {name}")`,
  },
  {
    id: 'cs7',
    category: 'control',
    categoryLabel: '流程與函式',
    title: 'zip 多序列平行配對',
    syntax: 'for a, b in zip(list1, list2):',
    description: '同步走訪兩個以上的序列，將相同位置的元素打包成元組。',
    example: `names = ["Amy", "Ben"]\nscores = [92, 85]\nfor n, s in zip(names, scores):\n    print(f"{n}: {s}")`,
  },
  {
    id: 'cs8',
    category: 'control',
    categoryLabel: '流程與函式',
    title: '匿名函式 lambda 與 sorted',
    syntax: 'lambda 參數: 回傳運算式',
    description: '搭配 sorted(..., key=...) 針對複雜資料進行單行自訂排序。',
    example: `items = [("書", 320), ("筆", 45), ("包", 890)]\nprint(sorted(items, key=lambda x: x[1]))`,
  },
  {
    id: 'cs9',
    category: 'structures',
    categoryLabel: '串列與字典',
    title: '串列推導式',
    syntax: '[expr for x in iter if cond]',
    description: '簡潔地從現有序列轉換並篩選產生新串列。',
    example: `nums = [1, 2, 3, 4, 5]\ndoubles = [n * 2 for n in nums if n > 2]\nprint(doubles)`,
  },
  {
    id: 'cs10',
    category: 'structures',
    categoryLabel: '串列與字典',
    title: '字典安全讀取 dict.get()',
    syntax: 'd.get(key, default)',
    description: '鍵存在時回傳對應值，不存在時回傳預設值而不會中斷程式。',
    example: `cfg = {"theme": "light"}\nprint(cfg.get("lang", "zh-TW"))`,
  },
  {
    id: 'cs11',
    category: 'structures',
    categoryLabel: '串列與字典',
    title: '集合交集與去重',
    syntax: 'set(list) / a.intersection(b)',
    description: '去除重複元素，或比較兩組資料的共同項目。',
    example: `a = {1, 2, 3}\nb = {2, 3, 4}\nprint("交集:", a.intersection(b))`,
  },
  {
    id: 'cs12',
    category: 'oop',
    categoryLabel: '物件導向',
    title: '類別建構與方法封裝',
    syntax: 'class Name: def __init__(self, ...):',
    description: '透過 __init__ 初始化實例屬性，並以方法封裝相關行為邏輯。',
    example: `class Counter:\n    def __init__(self):\n        self.val = 0\n    def inc(self):\n        self.val += 1\nc = Counter()\nc.inc()\nprint(c.val)`,
  },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: '執行下列 Python 程式碼後，螢幕會輸出什麼結果？',
    code: `x = 10
y = 3
print(x // y, x % y)`,
    options: ['3.33 1', '3 1', '3 0', '3.0 1'],
    correctIndex: 1,
    explanation: '「//」為整數除法，10 // 3 得商數 3；「%」為取餘數，10 % 3 得餘數 1。',
    relatedLessonId: 'l2',
  },
  {
    id: 'q2',
    question: '關於 f-string 字串格式化，下列哪一段輸出會是 "價格：12.50"？',
    code: `price = 12.5`,
    options: [
      'print(f"價格：{price:.2f}")',
      'print(f"價格：{price:2f}")',
      'print("價格：{price:.2f}")',
      'print(f"價格：(price:.2f)")',
    ],
    correctIndex: 0,
    explanation: 'f-string 必須在引號前加 f，變數用 { } 包裹，並以 :.2f 指定保留兩位小數。',
    relatedLessonId: 'l1',
  },
  {
    id: 'q3',
    question: '字串切片 text[1:4] 的輸出結果為何？',
    code: `text = "PYTHON"
print(text[1:4])`,
    options: ['PYTH', 'YTH', 'YTHO', 'PYT'],
    correctIndex: 1,
    explanation: '索引從 0 開始（P=0, Y=1, T=2, H=3, O=4），切片包含起點 1 但不包含終點 4，故為 "YTH"。',
    relatedLessonId: 'l3',
  },
  {
    id: 'q4',
    question: '下列程式碼執行後，變數 result 的值是什麼？',
    code: `score = 78
if score >= 90:
    result = "優"
elif score >= 75:
    result = "甲"
elif score >= 60:
    result = "乙"
else:
    result = "丙"`,
    options: ['"優"', '"甲"', '"乙"', '"丙"'],
    correctIndex: 1,
    explanation: 'if / elif 由上而下檢查，78 符合第一個滿足條件的 elif score >= 75，執行後便結束整個條件判斷。',
    relatedLessonId: 'l4',
  },
  {
    id: 'q5',
    question: 'range(2, 9, 3) 會依序產生哪些數字？',
    options: ['2, 5, 8', '2, 5, 8, 11', '2, 3, 4, 5, 6, 7, 8', '3, 6, 9'],
    correctIndex: 0,
    explanation: 'range(start=2, stop=9, step=3) 從 2 開始每次加 3，且不包含終點 9，因此產生 2, 5, 8。',
    relatedLessonId: 'l5',
  },
  {
    id: 'q6',
    question: '執行下列函式呼叫後，輸出結果為何？',
    code: `def greet(name, msg="你好"):
    return f"{msg}，{name}"

print(greet("小華"))`,
    options: ['發生參數缺少錯誤 TypeError', '小華，你好', '你好，小華', 'None'],
    correctIndex: 2,
    explanation: '第二個參數 msg 設有預設值 "你好"，當呼叫時未傳入第二個參數，會自動套用預設值。',
    relatedLessonId: 'l6',
  },
  {
    id: 'q7',
    question: '下列串列推導式執行後的結果是什麼？',
    code: `nums = [1, 2, 3, 4]
res = [x * 10 for x in nums if x % 2 == 1]
print(res)`,
    options: ['[20, 40]', '[10, 30]', '[10, 20, 30, 40]', '[1, 3]'],
    correctIndex: 1,
    explanation: 'if x % 2 == 1 篩選出奇數 1 與 3，再各自乘以 10，因此結果為 [10, 30]。',
    relatedLessonId: 'l7',
  },
  {
    id: 'q8',
    question: '當字典中不存在某個鍵時，使用哪種方法取值才不會產生 KeyError？',
    code: `user = {"name": "Kai"}`,
    options: ['user["role"]', 'user.find("role")', 'user.get("role", "guest")', 'user.index("role")'],
    correctIndex: 2,
    explanation: '字典的 .get(key, default) 方法在找不到對應鍵時會安全回傳預設值。',
    relatedLessonId: 'l8',
  },
  {
    id: 'q9',
    question: '將串列轉換為集合 set([3, 1, 2, 3, 1]) 後，len() 回傳的長度是多少？',
    options: ['5', '3', '2', '4'],
    correctIndex: 1,
    explanation: '集合 (Set) 會自動移除重複元素，只保留 {1, 2, 3} 共 3 個不重複的值。',
    relatedLessonId: 'l8',
  },
  {
    id: 'q10',
    question: '在 Python 的類別 (Class) 中，哪個特殊方法會在建立物件實例時自動執行？',
    options: ['__start__', '__main__', '__init__', '__create__'],
    correctIndex: 2,
    explanation: '__init__ 是類別的初始化建構方法，建立新物件時會自動呼叫以設定初始屬性。',
    relatedLessonId: 'l9',
  },
];
