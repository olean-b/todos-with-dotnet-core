using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Todos.Data;
using Todos.Models;

namespace Todos.Controllers
{
	public class HomeController : Controller
	{
		private readonly ILogger<HomeController> _logger;
		private readonly TodoContext _context;
		public HomeController(ILogger<HomeController> logger, TodoContext context)
		{
			_logger = logger;
			_context = context;
		}

		// GET: Todo
		public async Task<IActionResult> Index()
		{
			return View("Views/Todo/Index.cshtml", await _context.Todo.ToListAsync());
		}

		public IActionResult Privacy()
		{
			return View();
		}

		[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
		public IActionResult Error()
		{
			return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
		}
	}
}
