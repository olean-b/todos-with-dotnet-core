using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Mvc;

namespace Todos.Controllers
{
	public class TodoController : Controller
	{
		//
		// GET: /todo/
		public IActionResult Index()
		{
			return View();
		}

		//
		// GET: /todo/welcome/
		public string Welcome(string name, int numTimes = 1)
		{
			return HtmlEncoder.Default.Encode($"Hello {name}, NumTimes is: {numTimes}");
		}
	}
}