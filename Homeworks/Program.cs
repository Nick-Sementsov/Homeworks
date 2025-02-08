using System.Diagnostics.CodeAnalysis;
using System.Net.Http.Headers;
using System.Runtime.InteropServices;

Console.WriteLine("Задача 1");
Console.Write("Напишите возраст: ");
int AgeofUser =Convert.ToInt32(Console.ReadLine());
Console.Write("Напишите имя:");
string NameOfUser = Console.ReadLine();
string Greetings = $"Привет {NameOfUser} тебе {AgeofUser} лет! ";
Console.WriteLine(Greetings);
// Задача 2
Console.WriteLine("Задача 2");
int numb = 1;
bool booIspugalsia = false;
char charchick = '\0';
double d = 2.3;
string text= "Unity is best game engine ";
Console.WriteLine($"{d} {numb} {booIspugalsia} {charchick} {text}");
Console.WriteLine("Задача 3");
Console.Write("Веддите число:");
int numb2= Convert.ToInt32(Console.ReadLine());
int answer = numb2 * 2;
Console.WriteLine(answer);
Console.WriteLine("Задача 4");
Console.Write("Веддите число:");
int numb3 = Convert.ToInt32(Console.ReadLine());
if (numb3 > 0)
{
    Console.WriteLine("Число положительное!");
}
else if (numb3 < 0)
{
    Console.WriteLine("Число отрицательное!");
}
else
{
    Console.WriteLine("Число равно 0");
}
Console.WriteLine("Задача 5 ");
Console.WriteLine($"Число месяца: ");
int DayOfMouth = Convert.ToInt32(Console.ReadLine());
switch (DayOfMouth) {
    case 1:
        Console.WriteLine("Март");
    break; 
   case 2:
        Console.WriteLine("Апрель");
        break;
    case 3:
        Console.WriteLine("Май");
        break;
    case 4:
        Console.WriteLine("Июнь");
        break;
    case 5:
        Console.WriteLine("Июль");
        break;
    case 6:
        Console.WriteLine("Август");
        break;
    case 7:
        Console.WriteLine("Сентябрь");
        break;
    case 8:
        Console.WriteLine("Октябрь");
        break;
    case 9:
        Console.WriteLine("Ноябрь");
        break;
    case 10:
        Console.WriteLine("Декабрь");
        break;
    case 11:
        Console.WriteLine("Январь");
        break;
    case 12:
        Console.WriteLine("Февраль");
        break;
    default:
        Console.WriteLine("Неверное число!");
        break;
}
Console.WriteLine("Задача 6");
//я не понял как именно 
for (int i = 2; i <= 100; i += 2)
{
    Console.Write(i + " ");
}
Console.WriteLine("Задача 7");

int SummaChisel = 1;
while (SummaChisel < 50 )
{
        SummaChisel++;
    Console.Write($"{ SummaChisel} ");
}
Console.WriteLine(" Задача 8 ");
int[] ints = new int[11];
for (int i = 0; i < ints.Length; i++)
{
    Console.WriteLine($"{i} ");
}
Console.WriteLine("Задача 8");
int[] nomersOfMassuve = new int[10];
for (int i = 0; i < nomersOfMassuve.Length; i++)
{
    nomersOfMassuve[i]++;
    Console.Write($"{nomersOfMassuve[i] } ");
}
Console.WriteLine("Задача 9");
int randomnumber = Random.Shared.Next(1,100);
Console.WriteLine("Задача 10 ");
// Создание двумерного массива 3x3
int[,] array2D = new int[3, 3];
Random random = new Random();

// Заполнение массива случайными числами от 1 до 10
for (int i = 0; i < 3; i++)
{
    for (int j = 0; j < 3; j++)
    {
        array2D[i, j] = random.Next(1, 11); // Генерация числа от 1 до 10
    }
}

// Вывод содержимого массива
for (int i = 0; i < 3; i++)
{
    for (int j = 0; j < 3; j++)
    {
        Console.Write(array2D[i, j] + "\t");
    }
    Console.WriteLine();
}
// Задача 10 была списана на половину,я не особо понимаю массивы :(
Console.WriteLine("Задача 11 ");
static int Sum(int a, int b)
{
    return a + b;
}
int num1 = 15;
int num2 = 5;
int result = Sum(num1, num2);

Console.WriteLine($"Сумма {num1} и {num2} равна {result}");
Console.WriteLine("Задача 12 ");
List<int> numbers = new List<int>();
// Заполняем список 5 случайными числами
for (int i = 0; i < 5; i++)
{
    numbers.Add(random.Next(1, 101)); // Случайные числа от 1 до 100
}

// Выводим числа на экран
Console.WriteLine("Случайные числа:");
foreach (int number in numbers)
{
    Console.WriteLine(number);
}

// Вычисляем и выводим сумму
int sum = 0;
foreach (int number in numbers)
{
    sum += number;
}
Console.WriteLine($"Сумма чисел: {sum}");