// Python Full Boilerplate Template
// Language ID: 25 (Python for ML 3.11.2)

const PYTHON_TEMPLATE = `import sys

def main():
    input_data = sys.stdin.read().split()
    if len(input_data) >= 2:
        a = int(input_data[0])
        b = int(input_data[1])
        print(a + b)

if __name__ == "__main__":
    main()
`;

const PYTHON_LANGUAGE_ID = 25;
const PYTHON_FLAVOR = "EXTRA_CE";
const PYTHON_MONACO_MODE = "python";
const PYTHON_FILENAME = "solution.py";
