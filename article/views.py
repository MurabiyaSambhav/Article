from django.shortcuts import get_object_or_404, redirect, render
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.urls import reverse
from django.core.paginator import Paginator
from collections import Counter
from article.models import Cuser, Articles
from rest_framework.response import Response
from article.serializers import ArticleSerializer
from rest_framework import viewsets, filters
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
import json

# Your existing API viewset remains the same.
class ArticleHybridViewSet(viewsets.ModelViewSet):
    queryset = Articles.objects.filter(is_draft=False).select_related('author').order_by('-created_at')
    serializer_class = ArticleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'search_articles']:
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='search')
    @permission_classes([AllowAny])
    def search_articles(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        tag_query = request.query_params.get('tag', '').strip()

        if tag_query:
            queryset = queryset.filter(tags__icontains=tag_query)
        
        paginator = Paginator(queryset, 5)
        page_number = request.query_params.get('page', 1)
        page_obj = paginator.get_page(page_number)
        
        serializer = self.get_serializer(page_obj, many=True)
        return Response({
            'articles': serializer.data,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'current_page': page_obj.number,
            'total_pages': paginator.num_pages,
        })

# -------------------- Traditional Views (Modified for SSR) --------------------

def register(request):
    # Your register view logic remains correct for AJAX submissions.
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            email = data.get('email')
            password = data.get('password')
            phone = data.get('phone')

            if Cuser.objects.filter(email=email).exists():
                return JsonResponse({"success": False, "message": "Email already registered!"}, status=409)
            if Cuser.objects.filter(username=name).exists():
                return JsonResponse({"success": False, "message": "Username already taken!"}, status=409)

            user = Cuser(username=name, email=email, phone=phone)
            user.set_password(password)
            user.save()
            
            return JsonResponse({"success": True, "message": "Registration successful!", "redirect": reverse("login")})
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)
    return render(request, 'register.html')

def login(request):
    # Your login view logic remains correct for AJAX submissions.
    if request.user.is_authenticated:
        return redirect(reverse('article'))

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            try:
                user = Cuser.objects.get(email=email)
                if user.check_password(password):
                    auth_login(request, user)
                    return JsonResponse({"success": True, "message": "Login successful!", "redirect": reverse('article')})
                else:
                    return JsonResponse({"success": False, "message": "Invalid email or password."}, status=401)
            except Cuser.DoesNotExist:
                return JsonResponse({"success": False, "message": "Invalid email or password."}, status=401)
            
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)
    return render(request, 'login.html')

def logout(request):
    auth_logout(request)
    return redirect(reverse('article'))

# --- THIS IS THE KEY CHANGE FOR SSR ---
def article(request):
    user = request.user if request.user.is_authenticated else None
    
    # First, get all the tags for the tag cloud.
    all_tags_flat = []
    for art in Articles.objects.filter(is_draft=False):
        all_tags_flat.extend([tag.strip() for tag in art.tags.split(',') if tag.strip()])
    
    tag_counts_list = sorted(Counter(all_tags_flat).items())
    all_tags = sorted(list(set(all_tags_flat)))

    has_drafts = Articles.objects.filter(author=user, is_draft=True).exists() if user else False
    
    # Now, get the articles and handle pagination on the server.
    queryset = Articles.objects.filter(is_draft=False).select_related('author').order_by('-created_at')
    
    # You can apply filtering here based on request parameters if needed.
    tag_query = request.GET.get('tag', '').strip()
    if tag_query:
        queryset = queryset.filter(tags__icontains=tag_query)

    paginator = Paginator(queryset, 5)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # Process articles to make tags a list
    processed_articles = []
    # This is the corrected loop
    for article in page_obj.object_list:
        processed_article = {
            'id': article.id,
            'title': article.title,
            'content': article.content,
            'tags_list': [tag.strip() for tag in article.tags.split(',') if tag.strip()],
            'author': article.author,
        }
        # THIS LINE MUST BE INSIDE THE LOOP 
        processed_articles.append(processed_article)

    # Prepare the context with all the data for the template.
    context = {
        'user_name': user.username if user else None,
        'is_logged_in': bool(user),
        'tag_counts_list': tag_counts_list,
        'all_tags': all_tags,
        'has_drafts': has_drafts,
        'no_drafts': not has_drafts,
        'tag_query': tag_query,
        'articles': processed_articles,
        'page_obj': page_obj,
    }
    
    return render(request, 'article.html', context)
    
# The other views remain mostly the same.
@login_required(login_url='login')
def save_article(request, article_id=None):
    user = request.user
    article = get_object_or_404(Articles, id=article_id, author=user) if article_id else None

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            action = data.get('action')
            title = data.get('title')
            content = data.get('content')
            tags = data.get('tags')

            article = get_object_or_404(Articles, id=article_id, author=user) if article_id else None

            if action == 'cancel':
                redirect_to = reverse('draft_article') if article and article.is_draft else reverse('article')
                return JsonResponse({'success': True, 'redirect': redirect_to})

            if action == 'delete' and article:
                article.delete()
                return JsonResponse({"success": True, "message": "Article deleted!", "redirect": reverse('draft_article')})

            is_draft = (action == 'draft')

            if article:
                article.title = title
                article.content = content
                article.tags = tags
                article.is_draft = is_draft
                article.save()
                message = "Draft saved!" if is_draft else "Article updated successfully!"
            else:
                article = Articles.objects.create(
                    title=title,
                    content=content,
                    tags=tags,
                    author=user,
                    is_draft=is_draft
                )
                message = "Draft saved!" if is_draft else "Article published successfully!"
            
            redirect_to = reverse('draft_article') if is_draft else reverse('article')
            return JsonResponse({'success': True, 'message': message, 'redirect': redirect_to})

        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)
    else: # GET request
        context = {'article': article}
        return render(request, 'add_article.html', context)

@login_required(login_url='login')
def draft_article(request):
    drafts_qs = Articles.objects.filter(author=request.user, is_draft=True).order_by('-created_at')
    has_drafts = drafts_qs.exists()
    
    processed_drafts = list(drafts_qs.values(
        'id', 'title', 'content', 'tags', 'created_at', 'author__username'
    ))

    context = {
        'articles': processed_drafts,
        'is_logged_in': True,
        'user_name': request.user.username,
        'is_draft_page': True,
        'has_drafts': has_drafts,
        'no_drafts': not has_drafts,
    }
    
    return render(request, 'draft_article.html', context)

def tags(request, tag):
    # This view is now an entry point for a specific tag search.
    # It will pass the tag to the article view to filter the content.
    return redirect(reverse('article') + f'?tag={tag}')