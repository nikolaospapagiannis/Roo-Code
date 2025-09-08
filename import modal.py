Create your first app
Welcome to Modal! Let's get you set up to run an app.


Download and configure the Python client
Run this in order to install the Python library locally:

pip install modal
python3 -m modal setup


The first command will install the Modal client library on your computer, along with its dependencies.

The second command creates an API token by authenticating through your web browser. It will open a new tab, but you can close it when you are done.


Run some code
You're ready to run some code! To get started, here is a minimal script that computes the square of 42:

import modal

app = modal.App("example-get-started")


@app.function()
def square(x):
    print("This code is running on a remote worker!")
    return x**2


@app.local_entrypoint()
def main():
    print("the square is", square.remote(42))

Copy
Save the code to a local file such as:

cat > get_started.py # At the prompt, paste the snippet and Ctrl-D to save it.
modal run get_started.py

Copy
Congratulations, you successfully executed a function on a remote worker!


Modal logo
© 2025